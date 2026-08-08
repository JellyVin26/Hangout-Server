import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Visibility } from '@prisma/client';

@Injectable()
export class DiscoveryService {
  constructor(private readonly prisma: PrismaService) {}

  // Shared Hangout include: destination + host + participant count (PRD §14).
  private hangoutInclude = {
    destination: true,
    host: {
      select: { id: true, username: true, displayName: true, avatarUrl: true },
    },
    _count: { select: { participants: true } },
  };

  async feed(userId: string, lat?: number, lng?: number) {
    const now = new Date();

    // Friends of the current user — used to scope friends activity.
    const friends = await this.prisma.friend.findMany({
      where: { userId },
      select: { friendId: true },
    });
    const friendIds = friends.map((f) => f.friendId);

    const [nearbyPublicHangouts, trendingPlaces, friendsActivity] = await Promise.all([
      // Nearby public hangouts — upcoming PUBLIC events, soonest first.
      this.prisma.hangout.findMany({
        where: { visibility: Visibility.PUBLIC, startsAt: { gte: now } },
        orderBy: { startsAt: 'asc' },
        take: 10,
        include: this.hangoutInclude,
      }),

      // Trending places — top-rated, then most-reviewed.
      this.prisma.place
        .findMany({
          orderBy: [{ rating: 'desc' }, { reviewCount: 'desc' }],
          take: 10,
        })
        .then((places) =>
          places.map((p) => ({
            ...p,
            distanceKm:
              lat != null && lng != null
                ? this.haversineKm(lat, lng, p.lat, p.lng)
                : undefined,
          })),
        ),

      // Friends activity — upcoming hangouts hosted by the user's friends.
      friendIds.length
        ? this.prisma.hangout.findMany({
            where: { hostId: { in: friendIds }, startsAt: { gte: now } },
            orderBy: { startsAt: 'asc' },
            take: 10,
            include: this.hangoutInclude,
          })
        : Promise.resolve([]),
    ]);

    return { nearbyPublicHangouts, trendingPlaces, friendsActivity };
  }

  /** Great-circle distance in km between two lat/lng points (haversine). */
  private haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth radius (km)
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
  }
}
