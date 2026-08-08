import { Controller, Get, Query, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { DiscoveryService } from './discovery.service';

@ApiTags('discovery')
@ApiBearerAuth()
@Controller('discovery')
export class DiscoveryController {
  constructor(private readonly discovery: DiscoveryService) {}

  @Get()
  @ApiOperation({
    summary: 'Home feed: nearby public hangouts, trending places, friends activity',
  })
  @ApiQuery({
    name: 'lat',
    required: false,
    type: Number,
    description: 'Latitude for distance sorting of places',
  })
  @ApiQuery({
    name: 'lng',
    required: false,
    type: Number,
    description: 'Longitude for distance sorting of places',
  })
  feed(@Req() req: any, @Query('lat') lat?: string, @Query('lng') lng?: string) {
    return this.discovery.feed(
      req.user.userId,
      lat ? parseFloat(lat) : undefined,
      lng ? parseFloat(lng) : undefined,
    );
  }
}
