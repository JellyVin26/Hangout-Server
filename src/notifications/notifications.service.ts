import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Push notifications via the Expo push service (https://exp.host/--/api/v2/push/send).
 * Devices register an ExpoPushToken (from expo-notifications) — no Firebase/GCM config needed.
 */
@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async registerToken(userId: string, token: string, platform: string) {
    if (!token || !token.startsWith('ExponentPushToken')) return;
    await this.prisma.pushToken.upsert({
      where: { userId_token: { userId, token } },
      create: { userId, token, platform },
      update: { userId, token, platform },
    });
  }

  async unregisterToken(userId: string, token: string) {
    await this.prisma.pushToken.deleteMany({ where: { userId, token } });
  }

  /** Send to one user's registered devices. Fire-and-forget; never throws. */
  async pushToUser(userId: string, title: string, body: string, data: Record<string, string> = {}) {
    try {
      const tokens = await this.prisma.pushToken.findMany({ where: { userId } });
      if (tokens.length === 0) return;
      const messages = tokens.map((t) => ({
        to: t.token,
        sound: 'default',
        title,
        body,
        data,
      }));
      const res = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messages),
      });
      if (!res.ok) {
        console.error('Expo push failed', res.status, await res.text().catch(() => ''));
      } else {
        const json = (await res.json()) as any;
        // Drop tokens that Expo reports as invalid/expired
        json.data?.forEach((r: any, i: number) => {
          if (r?.status === 'error' && /DeviceNotRegistered|MessageTooBig/.test(r.details?.error ?? '')) {
            this.prisma.pushToken
              .delete({ where: { id: tokens[i]?.id } })
              .catch(() => {});
          }
        });
      }
    } catch (e) {
      console.error('Expo push error', e);
    }
  }

  async list(userId: string) {
    const rows = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    const items = rows.map((n) => {
      const payload = (n.payload ?? {}) as Record<string, any>;
      const title =
        n.type === 'HANGOUT_INVITE' ? 'New invite'
        : n.type === 'NEW_CHAT_MESSAGE' ? payload.authorId ? 'New message' : 'New activity'
        : n.type === 'RUNNING_LATE' ? 'Running late'
        : n.type === 'FRIEND_ARRIVED' ? 'Arrived'
        : n.type.replace(/_/g, ' ').toLowerCase();
      const body =
        payload.title ?? payload.body ?? payload.message ?? '';
      return { ...n, title, body, payload };
    });
    return { items, unreadCount: items.filter((n) => !n.read).length };
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
  }

  /** Create an in-app Notification row (Activity tab) + optionally push. */
  async notify(
    userId: string,
    type: string,
    data: Record<string, unknown>,
    opts: { title?: string; body?: string; push?: boolean } = {},
  ) {
    const n = await this.prisma.notification.create({
      data: { userId, type: type as any, payload: data as any },
    });
    if (opts.push !== false && opts.title && opts.body) {
      await this.pushToUser(userId, opts.title, opts.body, { id: n.id, type });
    }
    return n;
  }
}