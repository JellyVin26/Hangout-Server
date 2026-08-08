import { Module } from '@nestjs/common';
import { LiveGateway } from './live.gateway';
import { LiveService } from './live.service';

@Module({
  providers: [LiveGateway, LiveService]
})
export class LiveModule {}
