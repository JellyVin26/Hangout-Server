import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async updateMe(
    userId: string,
    patch: { displayName?: string; bio?: string; avatarUrl?: string },
  ) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(patch.displayName !== undefined ? { displayName: patch.displayName } : {}),
        ...(patch.bio !== undefined ? { bio: patch.bio } : {}),
        ...(patch.avatarUrl !== undefined ? { avatarUrl: patch.avatarUrl } : {}),
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        bio: true,
        avatarUrl: true,
        interests: true,
      },
    });
  }

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