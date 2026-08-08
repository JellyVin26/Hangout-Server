import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const EARTH_R = 6371;

interface SearchParams {
  q?: string;
  category?: string;
  lat?: number;
  lng?: number;
  take?: number;
}

@Injectable()
export class PlacesService {
  constructor(private readonly prisma: PrismaService) {}

  async search({ q, category, lat, lng, take = 20 }: SearchParams) {
    const where: any = {};
    if (q) {
      where.OR = [
        { name: { contains: q } },
        { address: { contains: q } },
      ];
    }
    if (category) where.category = category;

    const places = await this.prisma.place.findMany({
      where,
      take: Math.min(take, 50),
      orderBy: [{ rating: 'desc' }, { reviewCount: 'desc' }],
    });

    // sort by distance from user when coords provided
    if (lat && lng) {
      places.sort((a, b) => distKm(a, lat, lng) - distKm(b, lat, lng));
    }
    return places;
  }

  async findOne(id: string) {
    return this.prisma.place.findUnique({
      where: { id },
      include: {
        reviews: {
          include: { author: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });
  }
}

function distKm(place: { lat: number; lng: number }, lat: number, lng: number) {
  const dLat = ((place.lat - lat) * Math.PI) / 180;
  const dLng = ((place.lng - lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat * Math.PI) / 180) * Math.cos((place.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return EARTH_R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}