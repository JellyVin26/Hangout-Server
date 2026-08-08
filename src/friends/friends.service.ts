import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FriendsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string) {
    const rows = await this.prisma.friend.findMany({
      where: { userId },
      include: { friend: { select: { id: true, username: true, displayName: true, avatarUrl: true, bio: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((r) => r.friend);
  }

  async requests(userId: string) {
    const [incoming, outgoing] = await Promise.all([
      this.prisma.friendRequest.findMany({
        where: { recipientId: userId, status: 'PENDING' },
        include: { sender: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
      }),
      this.prisma.friendRequest.findMany({
        where: { senderId: userId, status: 'PENDING' },
        include: { recipient: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
      }),
    ]);
    return {
      incoming: incoming.map((r) => ({ id: r.id, user: r.sender, createdAt: r.createdAt })),
      outgoing: outgoing.map((r) => ({ id: r.id, user: r.recipient, createdAt: r.createdAt })),
    };
  }

  async send(userId: string, friendId: string) {
    if (userId === friendId) throw new BadRequestException('Cannot add yourself');
    const target = await this.prisma.user.findUnique({ where: { id: friendId } });
    if (!target) throw new NotFoundException('User not found');

    const existing = await this.prisma.friendRequest.findFirst({
      where: { senderId: userId, recipientId: friendId },
    });
    if (existing) return { status: 'already-sent', id: existing.id };

    // if they already sent us one, auto-accept (mutual)
    const reverse = await this.prisma.friendRequest.findFirst({
      where: { senderId: friendId, recipientId: userId, status: 'PENDING' },
    });
    if (reverse) {
      await this.accept(reverse.id);
      return { status: 'accepted-mutual' };
    }

    const req = await this.prisma.friendRequest.create({
      data: { senderId: userId, recipientId: friendId },
    });
    return { status: 'sent', id: req.id };
  }

  async accept(requestId: string) {
    const req = await this.prisma.friendRequest.findUnique({ where: { id: requestId } });
    if (!req) throw new NotFoundException('Request not found');
    await this.prisma.$transaction([
      this.prisma.friendRequest.update({ where: { id: requestId }, data: { status: 'ACCEPTED' } }),
      this.prisma.friend.upsert({
        where: { userId_friendId: { userId: req.senderId, friendId: req.recipientId } },
        create: { userId: req.senderId, friendId: req.recipientId },
        update: {},
      }),
      this.prisma.friend.upsert({
        where: { userId_friendId: { userId: req.recipientId, friendId: req.senderId } },
        create: { userId: req.recipientId, friendId: req.senderId },
        update: {},
      }),
    ]);
    return { status: 'accepted' };
  }

  async decline(requestId: string) {
    await this.prisma.friendRequest.update({
      where: { id: requestId },
      data: { status: 'DECLINED' },
    });
    return { status: 'declined' };
  }

  async remove(userId: string, friendId: string) {
    await this.prisma.$transaction([
      this.prisma.friend.deleteMany({ where: { userId, friendId } }),
      this.prisma.friend.deleteMany({ where: { userId: friendId, friendId: userId } }),
    ]);
    return { status: 'removed' };
  }
}