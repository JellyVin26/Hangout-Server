import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MemoriesService {
  constructor(private readonly prisma: PrismaService) {}

  list(hangoutId: string) {
    return this.prisma.memory.findMany({
      where: { hangoutId },
      orderBy: { createdAt: 'desc' },
      include: {
        author: true,
        _count: { select: { reactions: true } },
      },
    });
  }

  create(
    userId: string,
    hangoutId: string,
    data: { url: string; caption?: string; kind?: string },
  ) {
    return this.prisma.memory.create({
      data: {
        hangoutId,
        authorId: userId,
        url: data.url,
        caption: data.caption,
        kind: data.kind ?? 'PHOTO',
      },
      include: {
        author: true,
        _count: { select: { reactions: true } },
      },
    });
  }

  async toggleLike(userId: string, memoryId: string) {
    const existing = await this.prisma.memoryReaction.findUnique({
      where: { memoryId_userId: { memoryId, userId } },
    });

    if (existing) {
      await this.prisma.memoryReaction.delete({
        where: { memoryId_userId: { memoryId, userId } },
      });
      return { liked: false };
    }

    await this.prisma.memoryReaction.create({
      data: { memoryId, userId, kind: 'LIKE' },
    });
    return { liked: true };
  }

  async delete(userId: string, memoryId: string) {
    const memory = await this.prisma.memory.findUnique({
      where: { id: memoryId },
    });

    if (!memory) {
      throw new NotFoundException('Memory not found');
    }

    if (memory.authorId !== userId) {
      throw new ForbiddenException('You can only delete your own memories');
    }

    await this.prisma.memory.delete({ where: { id: memoryId } });
    return { deleted: true };
  }
}
