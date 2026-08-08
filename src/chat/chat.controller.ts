import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ChatService } from './chat.service';

@ApiTags('chat')
@ApiBearerAuth()
@Controller('hangouts')
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Get(':hangoutId/messages')
  @ApiOperation({ summary: 'Paginated messages for an event chat' })
  list(@Param('hangoutId') hangoutId: string, @Req() req: any) {
    return this.chat.list(hangoutId, req.user.userId);
  }

  @Post(':hangoutId/messages')
  @ApiOperation({ summary: 'Send a message (fallback if socket unavailable)' })
  send(@Req() req: any, @Param('hangoutId') hangoutId: string, @Body('body') body: string, @Body('kind') kind = 'TEXT') {
    return this.chat.create(req.user.userId, hangoutId, { body, kind });
  }
}
