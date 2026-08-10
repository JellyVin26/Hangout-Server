import { Module } from '@nestjs/common';
import { HangoutsController } from './hangouts.controller';
import { HangoutsService } from './hangouts.service';
import { PlacesModule } from '../places/places.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PlacesModule, NotificationsModule],
  controllers: [HangoutsController],
  providers: [HangoutsService],
})
export class HangoutsModule {}
