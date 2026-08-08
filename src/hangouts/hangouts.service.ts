import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateHangoutDto, VoteDto, Visibility } from './dto';

@Injectable()
export class HangoutsService {
  constructor(private readonly prisma: PrismaService) {}

  private include = {
    destination: true,
    host: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
    participants: {
      include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
    },
    _count: { select: { messages: true, votes: true } },
  };

  async create(userId: string, dto: CreateHangoutDto) {
    const hangout = await this.prisma.hangout.create({
      data: {
        title: dto.title,
        description: dto.description,
        startsAt: new Date(dto.startsAt),
        durationMin: dto.durationMin ?? 120,
        destinationId: dto.destinationId,
        visibility: (dto.visibility as Visibility) ?? Visibility.PRIVATE,
        maxParticipants: dto.maxParticipants,
        category: dto.category,
        hostId: userId,
        participants: {
          create: [{ userId }],
        },
        invites: dto.inviteUserIds?.length
          ? { create: dto.inviteUserIds.map((uid) => ({ userId: uid })) }
          : undefined,
      },
      include: this.include,
    });
    return hangout;
  }

  async list(userId: string, scope: 'upcoming' | 'past' = 'upcoming') {
    const now = new Date();
    const where = {
      participants: { some: { userId } },
      startsAt: scope === 'upcoming' ? { gte: now } : { lt: now },
    };
    return this.prisma.hangout.findMany({
      where,
      include: this.include,
      orderBy: { startsAt: scope === 'upcoming' ? 'asc' : 'desc' },
      take: 50,
    });
  }

  async getOne(id: string) {
    const hangout = await this.prisma.hangout.findUnique({ where: { id }, include: this.include });
    if (!hangout) throw new NotFoundException('Hangout not found');
    return hangout;
  }

  async join(userId: string, id: string) {
    const hangout = await this.getOne(id);
    if (hangout.maxParticipants && hangout.participants.length >= hangout.maxParticipants) {
      throw new BadRequestException('Hangout is full');
    }
    const existing = hangout.participants.find((p) => p.userId === userId);
    if (existing) return { status: 'already-joined' };

    await this.prisma.participant.create({ data: { hangoutId: id, userId } });
    return { status: 'joined' };
  }

  async vote(userId: string, id: string, dto: VoteDto) {
    const hangout = await this.getOne(id);
    const member = hangout.participants.some((p) => p.userId === userId);
    if (!member) throw new ForbiddenException('Only participants can vote');

    const place = await this.prisma.place.findUnique({ where: { id: dto.placeId } });
    if (!place) throw new NotFoundException('Place not found');

    const vote = await this.prisma.vote.upsert({
      where: { hangoutId_placeId_userId: { hangoutId: id, placeId: dto.placeId, userId } },
      create: { hangoutId: id, placeId: dto.placeId, userId },
      update: {},
    });
    return { status: 'voted', vote };
  }

  async results(id: string) {
    const votes = await this.prisma.vote.groupBy({
      by: ['placeId'],
      where: { hangoutId: id },
      _count: { _all: true },
      orderBy: { _count: { placeId: 'desc' } },
    });
    const places = await this.prisma.place.findMany({
      where: { id: { in: votes.map((v) => v.placeId) } },
    });
    return votes.map((v) => ({
      place: places.find((p) => p.id === v.placeId),
      votes: v._count._all,
    }));
  }

  async cancel(userId: string, id: string) {
    const hangout = await this.getOne(id);
    if (hangout.hostId !== userId) throw new ForbiddenException('Only the host can cancel');
    await this.prisma.hangout.delete({ where: { id } });
    return { status: 'cancelled' };
  }
}