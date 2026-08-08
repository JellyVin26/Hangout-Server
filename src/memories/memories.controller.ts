import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { MemoriesService } from './memories.service';

@ApiTags('memories')
@ApiBearerAuth()
@Controller()
export class MemoriesController {
  constructor(private readonly memoriesService: MemoriesService) {}

  @Get('hangouts/:hangoutId/memories')
  list(@Param('hangoutId') hangoutId: string) {
    return this.memoriesService.list(hangoutId);
  }

  @Post('hangouts/:hangoutId/memories')
  create(
    @Param('hangoutId') hangoutId: string,
    @Body() body: { url: string; caption?: string; kind?: string },
    @Req() req: any,
  ) {
    return this.memoriesService.create(req.user.userId, hangoutId, body);
  }

  @Post('memories/:id/like')
  toggleLike(@Param('id') id: string, @Req() req: any) {
    return this.memoriesService.toggleLike(req.user.userId, id);
  }

  @Delete('memories/:id')
  delete(@Param('id') id: string, @Req() req: any) {
    return this.memoriesService.delete(req.user.userId, id);
  }
}
