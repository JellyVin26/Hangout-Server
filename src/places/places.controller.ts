import { Controller, Get, Param, Query, NotFoundException, InternalServerErrorException, HttpCode, HttpStatus, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import type { Response } from 'express';
import { PlacesService } from './places.service';
import { PlacesDiscoveryService } from './places-discovery.service';

@ApiTags('places')
@ApiBearerAuth()
@Controller('places')
export class PlacesController {
  constructor(
    private readonly places: PlacesService,
    private readonly discovery: PlacesDiscoveryService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List / search places' })
  @ApiQuery({ name: 'q', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'lat', required: false })
  @ApiQuery({ name: 'lng', required: false })
  @ApiQuery({ name: 'take', required: false, example: '20' })
  async search(
    @Query('q') q?: string,
    @Query('category') category?: string,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('take') take?: string,
  ) {
    const latNum = lat ? Number(lat) : undefined;
    const lngNum = lng ? Number(lng) : undefined;
    const takeNum = take ? Number(take) : 20;

    const local = await this.places.search({
      q,
      category,
      lat: latNum,
      lng: lngNum,
      take: takeNum,
    });

    // Enrich with Google Places when a query is present and the API key is wired up.
    if (q && process.env.GOOGLE_MAPS_API_KEY) {
      try {
        const google = await this.discovery.search(q, latNum, lngNum, takeNum);
        const seen = new Set<string>();
        const merged = [];
        for (const g of google) {
          if (!g.googlePlaceId || seen.has(g.googlePlaceId)) continue;
          seen.add(g.googlePlaceId);
          merged.push(g);
        }
        for (const lp of local) {
          if (lp.googlePlaceId && seen.has(lp.googlePlaceId)) continue;
          if (!lp.id || !seen.has(lp.id)) {
            merged.push(lp);
            if (lp.id) seen.add(lp.id);
          }
        }
        return merged.slice(0, takeNum);
      } catch {
        // Local-only fallback when Google is unreachable.
        return local;
      }
    }
    return local;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a place with reviews' })
  async getOne(@Param('id') id: string) {
    const place = await this.places.findOne(id);
    if (!place) throw new NotFoundException('Place not found');
    return place;
  }

  /** Proxy Google photo bytes so the API key never reaches the client. */
  @Get('google/photo')
  @ApiOperation({ summary: 'Google Places photo proxy' })
  @HttpCode(HttpStatus.OK)
  async photo(@Query('ref') ref: string, @Res() res: Response) {
    if (!ref) throw new NotFoundException('Missing ref');
    if (!process.env.GOOGLE_MAPS_API_KEY) {
      throw new InternalServerErrorException('Google Maps API key not configured');
    }
    const url = new URL('https://maps.googleapis.com/maps/api/place/photo');
    url.searchParams.set('key', process.env.GOOGLE_MAPS_API_KEY);
    url.searchParams.set('photoreference', ref);
    url.searchParams.set('maxwidth', '800');
    const upstream = await fetch(url);
    if (!upstream.ok) throw new NotFoundException('Photo not available');
    res.setHeader('Content-Type', upstream.headers.get('Content-Type') ?? 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    const buf = Buffer.from(await upstream.arrayBuffer());
    res.send(buf);
  }
}
