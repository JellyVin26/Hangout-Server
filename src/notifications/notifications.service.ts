import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** Reminder windows in minutes. */
const REMINDER_WINDOWS = [
  24 * 60,   // 24h
  2 * 60,    // 2h
  30,        // 30m
  15,        // 15m
  5,         // 5m
];

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

  /**
   * Schedule reminder notifications for all non-cancelled hangouts starting soon.
   * Walks REMINDER_WINDOWS and emits one notify() per (user, hangout, window) that hasn't fired.
   * Idempotent via ReminderDelivery unique constraint.
   *
   * Triggered by Vercel Cron (every minute); safe to re-run repeatedly.
   */
  async runReminders(now = new Date()): Promise<{ scanned: number; fired: number; skipped: number; finalized: number }> {
    let scanned = 0;
    let fired = 0;
    let skipped = 0;

    const lookAhead = new Date(now.getTime() + 26 * 60 * 60 * 1000); // cover 24h window
    const windowsByHangout = await this.prisma.hangout.findMany({
      where: { startsAt: { gte: now, lte: lookAhead } },
      select: {
        id: true,
        title: true,
        startsAt: true,
        hostId: true,
        participants: { where: { status: { not: 'DECLINED' } }, select: { userId: true } },
      },
    });

    for (const h of windowsByHangout) {
      scanned++;
      const minutesAway = (h.startsAt.getTime() - now.getTime()) / 60000;
      for (const window of REMINDER_WINDOWS) {
        if (minutesAway > window + 5 || minutesAway < window - 5) continue; // 5-min slack
        for (const p of h.participants) {
          if (p.userId === h.hostId) continue; // host already knows
          try {
            await this.prisma.reminderDelivery.create({
              data: { userId: p.userId, hangoutId: h.id, windowMin: window },
            });
            const isLast = window <= 5;
            const title = isLast ? 'Starts soon' : `Reminder: ${h.title}`;
            const body = this.timeUntilLabel(window) + ` · ${h.title}`;
            await this.notify(p.userId, 'EVENT_REMINDER', { hangoutId: h.id, windowMin: window }, {
              title,
              body,
              push: true,
            });
            fired++;
          } catch (err: any) {
            // unique-key collision = already fired for this window — expected on cron re-runs
            if (err?.code === 'P2002') skipped++;
            else throw err;
          }
        }
      }
    }
    const finalized = await this.finalizeVotes(now);
    return { scanned, fired, skipped, finalized };
  }

  private async finalizeVotes(now: Date): Promise<number> {
    const hangouts = await this.prisma.hangout.findMany({
      where: { startsAt: { lte: now }, destinationId: null },
      select: {
        id: true,
        title: true,
        hostId: true,
        participants: { where: { status: { not: 'DECLINED' } }, select: { userId: true } },
      },
      take: 50,
    });

    let finalized = 0;
    for (const h of hangouts) {
      const votes = await this.prisma.vote.groupBy({
        by: ['placeId'],
        where: { hangoutId: h.id },
        _count: { _all: true },
        orderBy: { _count: { placeId: 'desc' } },
        take: 1,
      });
      const winner = votes[0]?.placeId;
      if (!winner) continue;

      const updated = await this.prisma.hangout.updateMany({
        where: { id: h.id, destinationId: null },
        data: { destinationId: winner },
      });
      if (updated.count === 0) continue;
      finalized++;

      for (const p of h.participants) {
        await this.notify(p.userId, 'DESTINATION_FINALIZED', { hangoutId: h.id, placeId: winner, title: h.title }, {
          title: 'Destination picked',
          body: `${h.title} has a final place.`,
          push: p.userId !== h.hostId,
        });
      }
    }
    return finalized;
  }

  private timeUntilLabel(min: number): string {
    if (min >= 60) return `${Math.round(min / 60)}h away`;
    return `${min}m away`;
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