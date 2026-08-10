import { Body, Controller, Delete, Get, Post, Req } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

const userId = (req: any) => req.user?.userId ?? req.user?.id;

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Post('push-token')
  registerToken(@Req() req: any, @Body('token') token: string, @Body('platform') platform = 'ios') {
    return this.notifications.registerToken(userId(req), token, platform);
  }

  @Delete('push-token')
  unregisterToken(@Req() req: any, @Body('token') token: string) {
    return this.notifications.unregisterToken(userId(req), token);
  }

  @Get()
  list(@Req() req: any) {
    return this.notifications.list(userId(req));
  }

  @Post('read-all')
  async markAllRead(@Req() req: any) {
    await this.notifications.markAllRead(userId(req));
    return { ok: true };
  }
}