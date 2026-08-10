import { Module } from '@nestjs/common';
import { PlacesController } from './places.controller';
import { PlacesService } from './places.service';
import { PlacesDiscoveryService } from './places-discovery.service';

@Module({
  controllers: [PlacesController],
  providers: [PlacesService, PlacesDiscoveryService],
  exports: [PlacesService, PlacesDiscoveryService],
})
export class PlacesModule {}