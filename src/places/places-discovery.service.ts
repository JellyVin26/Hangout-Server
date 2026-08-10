import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const GOOGLE_KEY = process.env.GOOGLE_MAPS_API_KEY;
const GOOGLE_BASE = 'https://maps.googleapis.com/maps/api/place';
const PUBLIC_BASE = process.env.PUBLIC_API_BASE_URL ?? 'https://hangout-server-neon.vercel.app';

type GoogleLatLng = { lat: number; lng: number };

type GooglePlace = {
  place_id?: string;
  name?: string;
  formatted_address?: string;
  vicinity?: string;
  geometry?: { location?: GoogleLatLng };
  rating?: number;
  user_ratings_total?: number;
  price_level?: number;
  photos?: Array<{ photo_reference: string }>;
  opening_hours?: { open_now?: boolean };
  business_status?: string;
  types?: string[];
};

@Injectable()
export class PlacesDiscoveryService {
  constructor(private readonly prisma: PrismaService) {}

  async search(q: string, lat?: number, lng?: number, take = 20) {
    if (!GOOGLE_KEY) throw new InternalServerErrorException('Google Maps API key not configured');
    const url = new URL(`${GOOGLE_BASE}/textsearch/json`);
    url.searchParams.set('key', GOOGLE_KEY);
    url.searchParams.set('query', q || 'hangout places');
    if (lat != null && lng != null) {
      url.searchParams.set('location', `${lat},${lng}`);
      url.searchParams.set('radius', '50000');
    }

    const data = await googleFetch<{ results?: GooglePlace[]; status: string; error_message?: string }>(url);
    const rows = await Promise.all((data.results ?? []).slice(0, Math.min(take, 20)).map((g) => this.toPlace(g, lat, lng)));
    return rows.sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
  }

  async details(placeId: string, lat?: number, lng?: number) {
    if (!GOOGLE_KEY) throw new InternalServerErrorException('Google Maps API key not configured');
    const url = new URL(`${GOOGLE_BASE}/details/json`);
    url.searchParams.set('key', GOOGLE_KEY);
    url.searchParams.set('place_id', placeId);
    url.searchParams.set('fields', 'place_id,name,formatted_address,geometry,rating,user_ratings_total,price_level,photos,opening_hours,types');

    const data = await googleFetch<{ result?: GooglePlace; status: string; error_message?: string }>(url);
    if (!data.result) return null;
    return this.toPlace(data.result, lat, lng);
  }

  photoUrl(ref: string) {
    const url = new URL(`${GOOGLE_BASE}/photo`);
    url.searchParams.set('key', GOOGLE_KEY ?? '');
    url.searchParams.set('photoreference', ref);
    url.searchParams.set('maxwidth', '800');
    return url.toString();
  }

  private async toPlace(g: GooglePlace, lat?: number, lng?: number) {
    const googlePlaceId = g.place_id;
    const cached = googlePlaceId
      ? await this.prisma.place.findUnique({ where: { googlePlaceId } })
      : null;
    const loc = g.geometry?.location;
    const photoRef = g.photos?.[0]?.photo_reference;
    const category = categoryFromGoogleTypes(g.types ?? []);
    return {
      id: cached?.id ?? googlePlaceId,
      googlePlaceId,
      name: g.name ?? cached?.name ?? 'Unknown place',
      category: cached?.category ?? category,
      address: g.formatted_address ?? g.vicinity ?? cached?.address ?? '',
      lat: loc?.lat ?? cached?.lat,
      lng: loc?.lng ?? cached?.lng,
      rating: g.rating ?? cached?.rating ?? 0,
      reviewCount: g.user_ratings_total ?? cached?.reviewCount ?? 0,
      priceLevel: g.price_level ?? cached?.priceLevel ?? 1,
      photoUrl: cached?.photoUrl ?? (photoRef ? `${PUBLIC_BASE}/places/google/photo?ref=${encodeURIComponent(photoRef)}` : null),
      openHours: g.opening_hours?.open_now == null ? cached?.openHours : g.opening_hours.open_now ? 'Open now' : 'Closed',
      tags: g.types?.slice(0, 4) ?? [],
      distanceKm: lat != null && lng != null && loc ? distKm(lat, lng, loc.lat, loc.lng) : 0,
    };
  }
}

async function googleFetch<T extends { status?: string; error_message?: string }>(url: URL): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new InternalServerErrorException(`Google Places HTTP ${res.status}`);
  const data = (await res.json()) as T;
  if (data.status && !['OK', 'ZERO_RESULTS'].includes(data.status)) {
    throw new InternalServerErrorException(data.error_message ?? `Google Places ${data.status}`);
  }
  return data;
}

function categoryFromGoogleTypes(types: string[]) {
  if (types.some((t) => ['cafe', 'bakery'].includes(t))) return 'Cafe';
  if (types.some((t) => ['restaurant', 'meal_takeaway', 'food'].includes(t))) return 'Food';
  if (types.some((t) => ['shopping_mall', 'store'].includes(t))) return 'Shopping';
  if (types.some((t) => ['gym', 'stadium'].includes(t))) return 'Sports';
  if (types.some((t) => ['night_club', 'bar'].includes(t))) return 'Nightlife';
  if (types.some((t) => ['tourist_attraction', 'park'].includes(t))) return 'Travel';
  return 'Cafe';
}

function distKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
