import { Global, Module } from '@nestjs/common';
import { PostHogService } from './posthog.service';
import { PostHogController } from './posthog.controller';

@Global()
@Module({
  providers: [PostHogService],
  controllers: [PostHogController],
  exports: [PostHogService],
})
export class PostHogModule {}