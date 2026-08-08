import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsDateString, IsNumber, Min, Max, IsEnum, IsArray } from 'class-validator';

export enum Visibility {
  PRIVATE = 'PRIVATE',
  FRIENDS_ONLY = 'FRIENDS_ONLY',
  PUBLIC = 'PUBLIC',
}

export class CreateHangoutDto {
  @ApiProperty({ example: 'Coffee & Catch Up' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ example: 'Come hungry for pastries' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: '2026-08-10T18:00:00Z' })
  @IsDateString()
  startsAt: string;

  @ApiPropertyOptional({ example: 90 })
  @IsOptional()
  @IsNumber()
  @Min(15)
  @Max(1440)
  durationMin?: number;

  @ApiPropertyOptional({ example: 'place-id' })
  @IsOptional()
  @IsString()
  destinationId?: string;

  @ApiPropertyOptional({ enum: Visibility, default: 'PRIVATE' })
  @IsOptional()
  @IsEnum(Visibility)
  visibility?: Visibility;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsNumber()
  maxParticipants?: number;

  @ApiPropertyOptional({ example: 'Cafe' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ example: ['user-id-1'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  inviteUserIds?: string[];
}

export class VoteDto {
  @ApiProperty({ example: 'place-id' })
  @IsString()
  placeId: string;
}