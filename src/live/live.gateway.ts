import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { LiveService } from './live.service';

interface LocationPayload {
  hangoutId: string;
  userId: string;
  lat: number;
  lng: number;
}

interface SessionPayload {
  hangoutId: string;
  userId: string;
  mode: 'ETA_ONLY' | 'LIVE';
}

@WebSocketGateway({
  namespace: 'live',
  cors: { origin: '*', methods: ['GET', 'POST'] },
})
export class LiveGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;

  constructor(private readonly live: LiveService) {}

  handleConnection(_client: Socket) {}

  handleDisconnect(client: Socket) {
    // cleanup is best-effort; sessions end via stop event or auto-expire
    void client;
  }

  @SubscribeMessage('join')
  onJoin(@MessageBody() data: { hangoutId: string }, @ConnectedSocket() client: Socket) {
    client.join(data.hangoutId);
  }

  @SubscribeMessage('start')
  async onStart(@MessageBody() data: SessionPayload) {
    const res = await this.live.startSession(data.userId, data.hangoutId, data.mode);
    this.server.to(data.hangoutId).emit('session_started', { userId: data.userId, ...res });
    return res;
  }

  @SubscribeMessage('stop')
  async onStop(@MessageBody() data: { hangoutId: string; userId: string }) {
    const res = await this.live.stopLocation(data.userId, data.hangoutId);
    this.server.to(data.hangoutId).emit('session_stopped', { userId: data.userId, ...res });
    return res;
  }

  @SubscribeMessage('location')
  async onLocation(@MessageBody() data: LocationPayload) {
    const res = await this.live.updateLocation(data.userId, data.hangoutId, data.lat, data.lng);

    this.server.to(data.hangoutId).emit('location', {
      userId: data.userId,
      lat: data.lat,
      lng: data.lng,
      arrived: res.arrived,
      distanceKm: res.distanceKm,
    });

    if (res.arrived) {
      this.server.to(data.hangoutId).emit('arrived', { userId: data.userId });
    }
    return res;
  }
}