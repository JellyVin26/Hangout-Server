import { Module } from '@nestjs/common';
import { LiveGateway } from './live.gateway';
import { LiveService } from './live.service';
import { LiveController } from './live.controller';

@Module({
  controllers: [LiveController],
  providers: [LiveGateway, LiveService]
})
export class LiveModule {}
