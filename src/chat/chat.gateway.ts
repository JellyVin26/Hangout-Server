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
import { ChatService } from './chat.service';

interface JoinPayload {
  hangoutId: string;
  userId: string;
}

interface ChatPayload extends JoinPayload {
  body: string;
  kind: string;
}

@WebSocketGateway({
  namespace: 'chat',
  cors: { origin: '*', methods: ['GET', 'POST'] },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;

  constructor(private readonly chat: ChatService) {}

  private sockets = new Map<string, string>(); // socketId -> userId

  handleConnection(_client: Socket) {}

  handleDisconnect(client: Socket) {
    this.sockets.delete(client.id);
  }

  @SubscribeMessage('join')
  async onJoin(@MessageBody() data: JoinPayload, @ConnectedSocket() client: Socket) {
    this.sockets.set(client.id, data.userId);
    const rooms = client.rooms;
    rooms.add(data.hangoutId);
    client.join(data.hangoutId);
  }

  @SubscribeMessage('leave')
  onLeave(@MessageBody() data: JoinPayload, @ConnectedSocket() client: Socket) {
    client.leave(data.hangoutId);
  }

  @SubscribeMessage('message')
  async onMessage(@MessageBody() data: ChatPayload, @ConnectedSocket() client: Socket) {
    const msg = await this.chat.create(data.userId, data.hangoutId, {
      body: data.body,
      kind: data.kind || 'TEXT',
    });
    this.server.to(data.hangoutId).emit('message', msg);
  }
}
