import { Controller, Get, Param, Query, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

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