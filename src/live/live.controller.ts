import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { LiveService } from './live.service';

/**
 * REST surface for the live location feature.
 *
 * The live gateway (Socket.io) is wired too, but Vercel serverless cannot keep a
 * socket open. The mobile app therefore polls and posts to these endpoints
 * instead. When a dedicated WS host is added, the gateway will become primary.
 */
@ApiTags('live')
@ApiBearerAuth()
@Controller('hangouts/:hangoutId/live')
export class LiveController {
  constructor(private readonly live: LiveService) {}

  @Post('start')
  @ApiOperation({ summary: 'Start sharing my location for this hangout' })
  start(
    @Req() req: any,
    @Param('hangoutId') hangoutId: string,
    @Body('mode') mode: 'ETA_ONLY' | 'LIVE' = 'LIVE',
  ) {
    return this.live.startSession(req.user.userId, hangoutId, mode);
  }

  @Post('location')
  @ApiOperation({ summary: 'Push a single lat/lng fix (polled by the client)' })
  updateLocation(
    @Req() req: any,
    @Param('hangoutId') hangoutId: string,
    @Body('lat') lat: number,
    @Body('lng') lng: number,
  ) {
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return { arrived: false, distanceKm: 0, error: 'lat/lng required' };
    }
    return this.live.updateLocation(req.user.userId, hangoutId, lat, lng);
  }

  @Post('stop')
  @ApiOperation({ summary: 'Stop sharing my location' })
  stop(@Req() req: any, @Param('hangoutId') hangoutId: string) {
    return this.live.stopLocation(req.user.userId, hangoutId);
  }

  @Get('board')
  @ApiOperation({ summary: 'Current arrival board for a hangout' })
  board(@Param('hangoutId') hangoutId: string) {
    return this.live.board(hangoutId);
  }
}
