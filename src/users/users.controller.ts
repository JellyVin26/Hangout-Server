import { Body, Controller, Get, NotFoundException, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Post('me')
  @ApiOperation({ summary: 'Update my profile (displayName, bio, avatarUrl)' })
  updateMe(@Req() req: any, @Body() body: { displayName?: string; bio?: string; avatarUrl?: string }) {
    return this.users.updateMe(req.user.userId, body);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search users by username / display name' })
  @ApiQuery({ name: 'q', required: true })
  search(@Query('q') q: string) {
    return this.users.search(q);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a user profile by id' })
  async getOne(@Param('id') id: string) {
    const user = await this.users.findOne(id);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }
}