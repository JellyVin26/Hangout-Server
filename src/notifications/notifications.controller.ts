import { Body, Controller, Delete, Get, Post, Req } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Post('push-token')
  registerToken(@Req() req: any, @Body('token') token: string, @Body('platform') platform = 'ios') {
    return this.notifications.registerToken(req.user.id, token, platform);
  }

  @Delete('push-token')
  unregisterToken(@Req() req: any, @Body('token') token: string) {
    return this.notifications.unregisterToken(req.user.id, token);
  }

  @Get()
  list(@Req() req: any) {
    return this.notifications.list(req.user.id);
  }

  @Post('read-all')
  async markAllRead(@Req() req: any) {
    await this.notifications.markAllRead(req.user.id);
    return { ok: true };
  }
}