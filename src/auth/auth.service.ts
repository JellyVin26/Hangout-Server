import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { RegisterDto, LoginDto } from './dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email: dto.email }, { username: dto.username }] },
    });
    if (existing) throw new ConflictException('Email or username already in use');

    const hash = bcrypt.hashSync(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        username: dto.username,
        displayName: dto.displayName,
        passwordHash: hash,
        bio: dto.bio,
        avatarUrl: dto.avatarUrl,
      },
    });
    return { token: this.sign(user.id, user.email), user: this.safe(user) };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user?.passwordHash) throw new UnauthorizedException('Invalid credentials');
    const ok = bcrypt.compareSync(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');
    return { token: this.sign(user.id, user.email), user: this.safe(user) };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: {
        interests: { include: { interest: true } },
        badges: { include: { badge: true } },
        friends: { select: { friend: { select: { id: true, username: true, displayName: true, avatarUrl: true } } }, take: 50 },
        favoritePlaces: { include: { place: true }, take: 20 },
        _count: { select: { hangoutsJoined: true, favoritePlaces: true } },
      },
    });
    return this.safe(user, { interests: user.interests.map(i => i.interest.name), badges: user.badges.map(b => b.badge.key), friends: user.friends.map(f => f.friend) });
  }

  private sign(userId: string, email: string) {
    return this.jwt.sign({ sub: userId, email });
  }

  private safe(user: any, extra: any = {}) {
    const { passwordHash, ...rest } = user;
    return { ...rest, ...extra };
  }
}