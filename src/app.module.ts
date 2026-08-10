import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { FriendsModule } from './friends/friends.module';
import { PlacesModule } from './places/places.module';
import { HangoutsModule } from './hangouts/hangouts.module';
import { ChatModule } from './chat/chat.module';
import { LiveModule } from './live/live.module';
import { NotificationsModule } from './notifications/notifications.module';
import { MemoriesModule } from './memories/memories.module';
import { DiscoveryModule } from './discovery/discovery.module';
import { UploadsModule } from './uploads/uploads.module';
import { AppController } from './app.controller';
import { SwaggerController } from './swagger.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    FriendsModule,
    PlacesModule,
    HangoutsModule,
    ChatModule,
    LiveModule,
    NotificationsModule,
    MemoriesModule,
    DiscoveryModule,
    UploadsModule,
  ],
  controllers: [AppController, SwaggerController],
})
export class AppModule {}