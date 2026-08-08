import { Controller, Post, Get, Delete, Body, Param, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FriendsService } from './friends.service';

@ApiTags('friends')
@ApiBearerAuth()
@Controller('friends')
export class FriendsController {
  constructor(private readonly friends: FriendsService) {}

  @Get()
  @ApiOperation({ summary: 'List my confirmed friends' })
  list(@Req() req: any) {
    return this.friends.list(req.user.userId);
  }

  @Get('requests')
  @ApiOperation({ summary: 'Incoming + outgoing friend requests' })
  requests(@Req() req: any) {
    return this.friends.requests(req.user.userId);
  }

  @Post('requests')
  @ApiOperation({ summary: 'Send a friend request to userId' })
  @HttpCode(HttpStatus.CREATED)
  send(@Req() req: any, @Body('userId') userId: string) {
    return this.friends.send(req.user.userId, userId);
  }

  @Post('requests/:id/accept')
  @ApiOperation({ summary: 'Accept an incoming friend request' })
  accept(@Param('id') id: string) {
    return this.friends.accept(id);
  }

  @Post('requests/:id/decline')
  @ApiOperation({ summary: 'Decline an incoming friend request' })
  decline(@Param('id') id: string) {
    return this.friends.decline(id);
  }

  @Delete(':friendId')
  @ApiOperation({ summary: 'Remove a friend' })
  remove(@Req() req: any, @Param('friendId') friendId: string) {
    return this.friends.remove(req.user.userId, friendId);
  }
}