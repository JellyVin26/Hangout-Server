import { Controller, Get, Param, Query, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PlacesService } from './places.service';

@ApiTags('places')
@ApiBearerAuth()
@Controller('places')
export class PlacesController {
  constructor(private readonly places: PlacesService) {}

  @Get()
  @ApiOperation({ summary: 'List / search places' })
  @ApiQuery({ name: 'q', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'lat', required: false })
  @ApiQuery({ name: 'lng', required: false })
  @ApiQuery({ name: 'take', required: false, example: '20' })
  search(
    @Query('q') q?: string,
    @Query('category') category?: string,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('take') take?: string,
  ) {
    return this.places.search({ q, category, lat: lat ? Number(lat) : undefined, lng: lng ? Number(lng) : undefined, take: take ? Number(take) : 20 });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a place with reviews' })
  async getOne(@Param('id') id: string) {
    const place = await this.places.findOne(id);
    if (!place) throw new NotFoundException('Place not found');
    return place;
  }
}