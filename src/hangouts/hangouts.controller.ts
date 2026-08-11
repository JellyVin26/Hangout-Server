import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { HangoutsService } from './hangouts.service';
import { CreateHangoutDto, VoteDto } from './dto';

@ApiTags('hangouts')
@ApiBearerAuth()
@Controller('hangouts')
export class HangoutsController {
  constructor(private readonly hangouts: HangoutsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new hangout' })
  create(@Req() req: any, @Body() dto: CreateHangoutDto) {
    return this.hangouts.create(req.user.userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List my hangouts (upcoming or past)' })
  @ApiQuery({ name: 'scope', enum: ['upcoming', 'past'], required: false, example: 'upcoming' })
  list(@Req() req: any, @Query('scope') scope: 'upcoming' | 'past' = 'upcoming') {
    return this.hangouts.list(req.user.userId, scope);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a hangout with participants, votes, destination' })
  getOne(@Param('id') id: string) {
    return this.hangouts.getOne(id);
  }

  @Post(':id/join')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Join / accept an invite' })
  join(@Req() req: any, @Param('id') id: string) {
    return this.hangouts.join(req.user.userId, id);
  }

  @Post(':id/decline')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Decline an invite' })
  decline(@Req() req: any, @Param('id') id: string) {
    return this.hangouts.decline(req.user.userId, id);
  }

  @Post(':id/vote')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Vote on a destination (participants only)' })
  vote(@Req() req: any, @Param('id') id: string, @Body() dto: VoteDto) {
    return this.hangouts.vote(req.user.userId, id, dto);
  }

  @Get(':id/votes')
  @ApiOperation({ summary: 'Current vote tally' })
  results(@Param('id') id: string) {
    return this.hangouts.results(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a hangout (host only)' })
  cancel(@Req() req: any, @Param('id') id: string) {
    return this.hangouts.cancel(req.user.userId, id);
  }
}