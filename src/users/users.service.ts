import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async search(q: string) {
    if (!q || q.trim().length < 2) return [];
    return this.prisma.user.findMany({
      where: {
        OR: [
          { username: { contains: q } },
          { displayName: { contains: q } },
        ],
      },
      select: {
        id: true, username: true, displayName: true, avatarUrl: true, bio: true,
        _count: { select: { friends: true } },
      },
      take: 20,
    });
  }

  async findOne(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true, username: true, displayName: true, bio: true, avatarUrl: true,
        verified: true, createdAt: true,
        interests: { include: { interest: true } },
        badges: { include: { badge: true } },
        favoritePlaces: { include: { place: true }, take: 20 },
        _count: { select: { friends: true, hangoutsJoined: true } },
      },
    });
  }
}