import { Module } from '@nestjs/common';
import { HangoutsController } from './hangouts.controller';
import { HangoutsService } from './hangouts.service';

@Module({
  controllers: [HangoutsController],
  providers: [HangoutsService]
})
export class HangoutsModule {}
