import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { PresenceService } from './presence.service';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import * as crypto from 'crypto';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/presence',
})
export class PresenceGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(PresenceGateway.name);

  constructor(private presenceService: PresenceService) {}

  async handleConnection(client: Socket) {
    const { noteId, userId, color } = client.handshake.query as Record<string, string>;
    const connectionId = crypto.randomUUID();

    if (!noteId || !userId) {
      this.logger.warn(` Missing params for connection`);
      client.disconnect();
      return;
    }

    client.data.connectionId = connectionId;
    client.data.noteId = noteId;
    client.data.userId = userId;
    client.join(noteId);

    await this.presenceService.join(noteId, userId, connectionId, color || '#00BFFF');
    const active = await this.presenceService.getActiveUsers(noteId);

    // broadcast list of active users
    this.server.to(noteId).emit('presence:update', active);
    this.logger.log(` User ${userId} joined note ${noteId}`);
  }

  async handleDisconnect(client: Socket) {
    const { connectionId, noteId } = client.data;
    if (!connectionId || !noteId) return;

    await this.presenceService.leave(connectionId);
    const active = await this.presenceService.getActiveUsers(noteId);
    this.server.to(noteId).emit('presence:update', active);
    this.logger.log(` Connection ${connectionId} disconnected`);
  }

  @SubscribeMessage('cursor:move')
  async handleCursorMove(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
    const { connectionId, noteId } = client.data;
    if (!connectionId) return;

    await this.presenceService.updateCursor(connectionId, data);
    const active = await this.presenceService.getActiveUsers(noteId);
    this.server.to(noteId).emit('presence:update', active);
  }
}
