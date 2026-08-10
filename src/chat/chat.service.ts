import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface MsgPayload {
  body: string;
  kind: string;
}

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  async list(hangoutId: string, userId: string) {
    const hangout = await this.prisma.hangout.findUnique({
      where: { id: hangoutId },
      select: { participants: { where: { userId } } },
    });
    if (!hangout) throw new NotFoundException('Hangout not found');
    if (!hangout.participants.length) throw new ForbiddenException('Not a participant');

    return this.prisma.message.findMany({
      where: { hangoutId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { author: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
    });
  }

  async create(userId: string, hangoutId: string, payload: MsgPayload & { mediaUrl?: string }) {
    const hangout = await this.prisma.hangout.findUnique({
      where: { id: hangoutId },
      select: { participants: { where: { userId } } },
    });
    if (!hangout) throw new NotFoundException('Hangout not found');
    if (!hangout.participants.length) throw new ForbiddenException('Not a participant');

    return this.prisma.message.create({
      data: {
        hangoutId,
        authorId: userId,
        body: payload.body,
        kind: payload.kind,
        mediaUrl: payload.mediaUrl,
      },
      include: { author: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
    });
  }
}
