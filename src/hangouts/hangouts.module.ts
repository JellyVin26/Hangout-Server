import { Module } from '@nestjs/common';
import { HangoutsController } from './hangouts.controller';
import { HangoutsService } from './hangouts.service';
import { PlacesModule } from '../places/places.module';

@Module({
  imports: [PlacesModule],
  controllers: [HangoutsController],
  providers: [HangoutsService]
})
export class HangoutsModule {}
