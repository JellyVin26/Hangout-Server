import { Body, Controller, Delete, Get, Post, Query, Req } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { Public } from '../auth/decorators';

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

  /**
   * Vercel Cron hits this every minute. Secured by CRON_SECRET (query string).
   * Returns counts so the cron log shows what happened.
   */
  @Public()
  @Post('reminders/run')
  async runReminders(@Query('secret') secret?: string) {
    if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
      return { ok: false, reason: 'unauthorized' };
    }
    return this.notifications.runReminders();
  }
}