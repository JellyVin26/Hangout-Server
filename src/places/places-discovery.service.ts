import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const GOOGLE_KEY = process.env.GOOGLE_MAPS_API_KEY;
const PLACES_BASE = 'https://places.googleapis.com/v1';
const PUBLIC_BASE = process.env.PUBLIC_API_BASE_URL ?? 'https://hangout-server-neon.vercel.app';

type NewGooglePlace = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  rating?: number;
  userRatingCount?: number;
  priceLevel?: string;
  photos?: Array<{ name: string }>;
  types?: string[];
};

@Injectable()
export class PlacesDiscoveryService {
  constructor(private readonly prisma: PrismaService) {}

  async search(q: string, lat?: number, lng?: number, take = 20) {
    if (!GOOGLE_KEY) throw new InternalServerErrorException('Google Maps API key not configured');
    const url = `${PLACES_BASE}/places:searchText`;
    const body = {
      textQuery: q || 'hangout places',
      ...(lat != null && lng != null
        ? { locationBias: { circle: { center: { latitude: lat, longitude: lng }, radius: 50000 } } }
        : {}),
    };
    const fields = 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.priceLevel,places.photos,places.types';

    const data = await this.googlePost<{ places?: NewGooglePlace[] }>(url, body, fields);
    const rows = await Promise.all((data.places ?? []).slice(0, Math.min(take, 20)).map((g) => this.toPlace(g, lat, lng)));
    return rows.sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
  }

  async details(placeId: string, lat?: number, lng?: number) {
    if (!GOOGLE_KEY) throw new InternalServerErrorException('Google Maps API key not configured');
    const url = `${PLACES_BASE}/places/${placeId}`;
    const fields = 'id,displayName,formattedAddress,location,rating,userRatingCount,priceLevel,photos,types';

    const data = await this.googleGet<NewGooglePlace>(url, fields);
    return this.toPlace(data, lat, lng);
  }

  photoUrl(photoName: string) {
    const url = `${PLACES_BASE}/${photoName}/media`;
    return `${url}?key=${GOOGLE_KEY}&maxWidthPx=800`;
  }

  async photoProxy(photoName: string, res: any) {
    if (!GOOGLE_KEY) throw new InternalServerErrorException('Google Maps API key not configured');
    const url = `${PLACES_BASE}/${photoName}/media?key=${GOOGLE_KEY}&maxWidthPx=800`;
    const upstream = await fetch(url);
    if (!upstream.ok) throw new InternalServerErrorException('Photo not available');
    res.setHeader('Content-Type', upstream.headers.get('Content-Type') ?? 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    const buf = Buffer.from(await upstream.arrayBuffer());
    res.send(buf);
  }

  private async toPlace(g: NewGooglePlace, lat?: number, lng?: number) {
    const googlePlaceId = g.id;
    const cached = googlePlaceId
      ? await this.prisma.place.findUnique({ where: { googlePlaceId } })
      : null;
    const loc = g.location;
    const photoName = g.photos?.[0]?.name;
    const category = categoryFromGoogleTypes(g.types ?? []);
    return {
      id: cached?.id ?? googlePlaceId,
      googlePlaceId,
      name: g.displayName?.text ?? cached?.name ?? 'Unknown place',
      category: cached?.category ?? category,
      address: g.formattedAddress ?? cached?.address ?? '',
      lat: loc?.latitude ?? cached?.lat,
      lng: loc?.longitude ?? cached?.lng,
      rating: g.rating ?? cached?.rating ?? 0,
      reviewCount: g.userRatingCount ?? cached?.reviewCount ?? 0,
      priceLevel: priceLevelFromString(g.priceLevel ?? cached?.priceLevel ?? undefined),
      photoUrl: cached?.photoUrl ?? (photoName ? `${PUBLIC_BASE}/places/google/photo?name=${encodeURIComponent(photoName)}` : null),
      openHours: cached?.openHours,
      tags: g.types?.slice(0, 4) ?? [],
      distanceKm: lat != null && lng != null && loc ? distKm(lat, lng, loc.latitude, loc.longitude) : 0,
    };
  }

  private async googlePost<T>(url: string, body: any, fieldMask: string) {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_KEY!,
        'X-Goog-FieldMask': fieldMask,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new InternalServerErrorException(`Google Places HTTP ${res.status}`);
    return res.json() as Promise<T>;
  }

  private async googleGet<T>(url: string, fieldMask: string) {
    const res = await fetch(`${url}?key=${GOOGLE_KEY}&fields=${fieldMask}`);
    if (!res.ok) throw new InternalServerErrorException(`Google Places HTTP ${res.status}`);
    return res.json() as Promise<T>;
  }
}

function categoryFromGoogleTypes(types: string[]) {
  if (types.some((t) => ['cafe', 'bakery', 'coffee_shop'].includes(t))) return 'Cafe';
  if (types.some((t) => ['restaurant', 'meal_takeaway', 'food', 'bakery'].includes(t))) return 'Food';
  if (types.some((t) => ['shopping_mall', 'store'].includes(t))) return 'Shopping';
  if (types.some((t) => ['gym', 'stadium'].includes(t))) return 'Sports';
  if (types.some((t) => ['night_club', 'bar'].includes(t))) return 'Nightlife';
  if (types.some((t) => ['tourist_attraction', 'park'].includes(t))) return 'Travel';
  return 'Cafe';
}

function priceLevelFromString(s?: string | number): number {
  if (typeof s === 'number') return s;
  if (!s) return 1;
  switch (s.toUpperCase()) {
    case 'PRICE_LEVEL_FREE': return 1;
    case 'PRICE_LEVEL_INEXPENSIVE': return 1;
    case 'PRICE_LEVEL_MODERATE': return 2;
    case 'PRICE_LEVEL_EXPENSIVE': return 3;
    case 'PRICE_LEVEL_VERY_EXPENSIVE': return 4;
    default: return 1;
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