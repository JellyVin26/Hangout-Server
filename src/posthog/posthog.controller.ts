import { Controller, Post, Body, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { Public } from '../auth/decorators';
import { PostHogService } from './posthog.service';

@Public()
@Controller('posthog')
export class PostHogController {
  constructor(private readonly posthog: PostHogService) {}

  @Post('track')
  @HttpCode(HttpStatus.OK)
  track(@Req() req: any, @Body() body: { event: string; properties?: Record<string, any> }) {
    const userId = req.user?.userId ?? 'anonymous';
    this.posthog.capture(userId, body.event, body.properties);
    return { ok: true };
  }
}