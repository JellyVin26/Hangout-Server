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
  ],
})
export class AppModule {}