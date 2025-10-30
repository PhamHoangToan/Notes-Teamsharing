import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/notification',
})
export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger(NotificationGateway.name);

  // Map userId -> Set<socketId> (1 user có thể mở nhiều tab)
  private userSockets = new Map<string, Set<string>>();

  handleConnection(client: Socket) {
    const userId = client.handshake.query.userId as string;

    if (!userId) {
      this.logger.warn('Missing userId in connection handshake');
      client.disconnect();
      return;
    }

    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }

    this.userSockets.get(userId)!.add(client.id);

    this.logger.log(` [Connect] User ${userId} connected (${client.id})`);
    this.logger.debug(
      `[Map] Total sockets for ${userId}: ${this.userSockets.get(userId)!.size}`,
    );

    
    this.server.to(client.id).emit('notification:connected', {
      message: ' Connected to notification gateway',
      userId,
      socketId: client.id,
    });
  }


  handleDisconnect(client: Socket) {
    for (const [userId, sockets] of this.userSockets.entries()) {
      if (sockets.has(client.id)) {
        sockets.delete(client.id);

        if (sockets.size === 0) {
          this.userSockets.delete(userId);
          this.logger.log(`[Disconnect] User ${userId} fully disconnected`);
        } else {
          this.logger.debug(
            ` [Disconnect] User ${userId} still has ${sockets.size} active tab(s)`,
          );
        }
      }
    }
  }


  pushToUser(userId: string, notif: any) {
  const sockets = this.userSockets.get(userId);

  if (!sockets || sockets.size === 0) {
    this.logger.warn(` [Gateway] Không có socket active cho user ${userId}`);
    return;
  }

  for (const socketId of sockets) {
    this.server.to(socketId).emit('notification:new', notif);
    this.logger.log(` [Gateway] Gửi event 'notification:new' tới socket ${socketId}`);
  }

  this.logger.log(` [Gateway] Gửi notification thành công tới ${userId} (${sockets.size} socket(s))`);
}


  @SubscribeMessage('notification:list')
  handleList(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
    const { userId } = data;
    if (!userId) {
      this.logger.warn(' [List] Missing userId in request payload');
      return;
    }

    this.logger.log(` [List] User ${userId} requested notification list`);
    this.server.to(client.id).emit('notification:list', []);
  }

  
  logConnections() {
    this.logger.debug(
      `[Connections] Current userSockets map: ${JSON.stringify(
        Array.from(this.userSockets.entries()).map(([u, s]) => ({
          userId: u,
          socketCount: s.size,
        })),
      )}`,
    );
  }
}
