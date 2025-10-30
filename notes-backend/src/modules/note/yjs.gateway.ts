import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import * as Y from 'yjs';
import { Logger } from '@nestjs/common';
import { NoteService } from './note.service';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/yjs', // clients connect to ws://host/yjs
})
export class YjsGateway {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(YjsGateway.name);
  private rooms = new Map<string, Uint8Array>(); // store current doc states in memory

  constructor(private readonly noteService: NoteService) {}

  // Client join a note room
  @SubscribeMessage('join')
  async handleJoin(
    @MessageBody() data: { noteId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { noteId } = data;
    client.join(noteId);

    // Send current document state (if any) to new user
    const state = this.rooms.get(noteId);
    if (state) client.emit('sync', state);

    this.logger.log(` Client joined room: ${noteId}`);
  }

  // Handle Yjs update events from clients
  @SubscribeMessage('update')
  async handleUpdate(
    @MessageBody() data: { noteId: string; update: ArrayBuffer; editorId?: string },
    @ConnectedSocket() client: Socket,
  ) {
    const noteId = data.noteId;
    const update = new Uint8Array(data.update);

    const current = this.rooms.get(noteId);
    const merged = current ? Y.mergeUpdates([current, update]) : update;
    this.rooms.set(noteId, merged);

    // Broadcast to everyone in the same note
    this.server.to(noteId).emit('update', update);

    // (Optional) Lưu định kỳ snapshot vào MongoDB
    await this.noteService.saveSnapshot(noteId, merged, data.editorId);

    this.logger.log(` Received Yjs update for note ${noteId} (${update.length} bytes)`);
  }
}
