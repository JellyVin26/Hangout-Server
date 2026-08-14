import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

interface MsgPayload {
  body: string;
  kind: string;
}

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

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

      const msg = await this.prisma.message.create({
        data: {
          hangoutId,
          authorId: userId,
          body: payload.body,
          kind: payload.kind,
          mediaUrl: payload.mediaUrl,
        },
        include: { author: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
      });

      // Sync participant attendance status if this is a check-in message
      const lower = payload.body.toLowerCase();
      let attendanceUpdate: 'ON_THE_WAY' | 'ARRIVED' | null = null;
      if (lower.includes('arrived') || lower.includes("i'm here") || lower.includes('im here')) {
        attendanceUpdate = 'ARRIVED';
      } else if (lower.includes('on my way') || lower.includes('on the way') || lower.includes('running late')) {
        attendanceUpdate = 'ON_THE_WAY';
      }
      if (attendanceUpdate) {
        await this.prisma.participant.updateMany({
          where: { hangoutId, userId },
          data: { attendance: attendanceUpdate },
        }).catch(() => undefined);
      }

      // Notify other participants
      for (const p of hangout.participants) {
        if (p.userId !== userId) {
          await this.notifications.notify(
            p.userId,
            'NEW_CHAT_MESSAGE',
            { hangoutId, messageId: msg.id, authorId: userId },
            { title: msg.author?.displayName ?? 'New message', body: msg.body.slice(0, 100) },
          );
        }
      }
      return msg;
    }
}
