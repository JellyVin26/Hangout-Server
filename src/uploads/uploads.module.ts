import { Module } from '@nestjs/common';
import { UploadsController, MediaController } from './uploads.controller';

@Module({
  controllers: [UploadsController, MediaController],
})
export class UploadsModule {}
