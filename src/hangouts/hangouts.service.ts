import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateHangoutDto, VoteDto, Visibility } from './dto';
import { PlacesDiscoveryService } from '../places/places-discovery.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class HangoutsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly discovery: PlacesDiscoveryService,
    private readonly notifications: NotificationsService,
  ) {}

  private include = {
    destination: true,
    host: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
    participants: {
      include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
    },
    _count: { select: { messages: true, votes: true } },
  };

  /** Resolve a place reference (cuid or googlePlaceId) to a local Place row. */
  private async resolveDestination(ref: string) {
    const byCuid = await this.prisma.place.findUnique({ where: { id: ref } });
    if (byCuid) return byCuid;
    const byGoogleId = await this.prisma.place.findUnique({ where: { googlePlaceId: ref } });
    if (byGoogleId) return byGoogleId;
    // Try fetching from Google and upserting as a local Place.
    if (process.env.GOOGLE_MAPS_API_KEY) {
      try {
        const place = await this.discovery.details(ref);
                if (place?.googlePlaceId) {
                  const photoUrl = place.photoUrl ?? null;
                  const category = place.category ?? 'Other';
                  return this.prisma.place.upsert({
                    where: { googlePlaceId: place.googlePlaceId },
                    create: {
                      googlePlaceId: place.googlePlaceId,
                      name: place.name,
                      category,
                      address: place.address ?? '',
                                            lat: place.lat ?? 0,
                                            lng: place.lng ?? 0,
                                            rating: place.rating ?? 0,
                                            reviewCount: place.reviewCount ?? 0,
                                            priceLevel: place.priceLevel ?? 1,
                                            photoUrl,
                                          },
                                          update: {
                                            name: place.name,
                                            category,
                                            address: place.address ?? '',
                                            lat: place.lat ?? 0,
                                            lng: place.lng ?? 0,
                      rating: place.rating ?? 0,
                      reviewCount: place.reviewCount ?? 0,
                      priceLevel: place.priceLevel ?? 1,
                      photoUrl: photoUrl ?? undefined,
                    },
                  });
                }
      } catch {
        // fallthrough
      }
    }
    return null;
  }

  async create(userId: string, dto: CreateHangoutDto) {
    let destinationId: string | null = null;
    if (dto.destinationId) {
      const dest = await this.resolveDestination(dto.destinationId);
      if (!dest) throw new BadRequestException(`Unknown destination: ${dto.destinationId}`);
      destinationId = dest.id;
    }
    const hangout = await this.prisma.hangout.create({
      data: {
        title: dto.title,
        description: dto.description,
        startsAt: new Date(dto.startsAt),
        durationMin: dto.durationMin ?? 120,
        destinationId,
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
          // Notify invited users
          for (const uid of dto.inviteUserIds ?? []) {
            await this.notifications.notify(
              uid,
              'HANGOUT_INVITE',
              { hangoutId: hangout.id, title: hangout.title, hostId: userId },
              { title: `${hangout.title}`, body: `You're invited! Tap to join.` },
            );
          }
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

    const place = await this.resolveDestination(dto.placeId);
    if (!place) throw new NotFoundException('Place not found');

    const vote = await this.prisma.vote.upsert({
      where: { hangoutId_placeId_userId: { hangoutId: id, placeId: place.id, userId } },
      create: { hangoutId: id, placeId: place.id, userId },
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