import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const GEOFENCE_KM = 0.1; // 100 m arrival radius
@Injectable()
export class LiveService {
  constructor(private readonly prisma: PrismaService) {}

  /** Broadcast push of a location update; returns { arrived } when geofence crossed. */
  async updateLocation(
    userId: string,
    hangoutId: string,
    lat: number,
    lng: number,
  ): Promise<{ arrived: boolean; distanceKm: number }> {
    const participant = await this.prisma.participant.findUnique({
      where: { hangoutId_userId: { hangoutId, userId } },
      include: { hangout: { include: { destination: true } } },
    });
    if (!participant) throw new Error('Not a participant');
    if (participant.attendance === 'ARRIVED') return { arrived: true, distanceKm: 0 };

    const dest = participant.hangout.destination;
    const distanceKm = dest
      ? distKm(lat, lng, dest.lat, dest.lng)
      : 0;
    const arrived = dest ? distanceKm <= GEOFENCE_KM : false;

    await this.prisma.participant.update({
      where: { hangoutId_userId: { hangoutId, userId } },
      data: {
        lastLat: lat,
        lastLng: lng,
        sharing: 'LIVE',
        attendance: arrived
          ? 'ARRIVED'
          : participant.attendance === 'NOT_STARTED'
            ? 'ON_THE_WAY'
            : participant.attendance,
      },
    });

    if (arrived) {
      await this.prisma.locationSession.updateMany({
        where: { hangoutId, userId, endedAt: null },
        data: { endedAt: new Date() },
      });
    }

    return { arrived, distanceKm };
  }

  async startSession(userId: string, hangoutId: string, mode: 'ETA_ONLY' | 'LIVE') {
    await this.prisma.locationSession.create({
      data: { hangoutId, userId, mode, lat: 0, lng: 0 },
    });
    await this.prisma.participant.update({
      where: { hangoutId_userId: { hangoutId, userId } },
      data: { sharing: mode, attendance: 'ON_THE_WAY' },
    });
    return { status: 'started', mode };
  }

  async stopLocation(userId: string, hangoutId: string) {
    await this.prisma.locationSession.updateMany({
      where: { hangoutId, userId, endedAt: null },
      data: { endedAt: new Date() },
    });
    await this.prisma.participant.update({
      where: { hangoutId_userId: { hangoutId, userId } },
      data: { sharing: 'NONE' },
    });
    return { status: 'stopped' };
  }

  /** Live board: destinations + participants with their updated location/status. */
  async board(hangoutId: string) {
    const hangout = await this.prisma.hangout.findUnique({
      where: { id: hangoutId },
      include: {
        destination: true,
        participants: {
          include: {
            user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
          },
          orderBy: { attendance: 'asc' },
        },
        locationSessions: { where: { endedAt: null } },
      },
    });

    if (!hangout) return null;

    // Real ETA per participant: haversine distance to the destination at a
    // default walking pace (5 km/h). Only when we have both fixes.
    const dest = hangout.destination;
    const walkSpeedKmh = 5;
    const participants = hangout.participants.map((pp) => {
      let distanceKm: number | null = null;
      let etaMin: number | null = null;
      if (dest && pp.lastLat != null && pp.lastLng != null && dest.lat && dest.lng) {
        distanceKm = distKm(pp.lastLat, pp.lastLng, dest.lat, dest.lng);
        etaMin = Math.max(1, Math.round((distanceKm / walkSpeedKmh) * 60));
      }
      return { ...pp, distanceKm, etaMin };
    });

    return { ...hangout, participants };
  }
}

function distKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}