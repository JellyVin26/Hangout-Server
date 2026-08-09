import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from './auth/decorators';

@ApiTags('meta')
@Controller()
export class AppController {
  @Public()
  @Get()
  @ApiOperation({ summary: 'API root — service info' })
  root() {
    return {
      name: 'Hangout API',
      version: '1.0',
      docs: '/docs',
      endpoints: [
        'POST /auth/register',
        'POST /auth/login',
        'GET /auth/me',
        'GET /hangouts',
        'GET /places',
        'GET /discovery',
        'GET /notifications',
      ],
      status: 'ok',
    };
  }

  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Health check' })
  health() {
    return { status: 'ok', uptime: process.uptime(), ts: new Date().toISOString() };
  }
}