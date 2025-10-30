import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Note, NoteSchema } from './note.schema';
import { NoteHistory, NoteHistorySchema } from './noteHistory.schema';
import { Comment, CommentSchema } from './comment.schema';
import { Presence, PresenceSchema } from './presence.schema';
import { NoteService } from './note.service';
import { PresenceService } from './presence.service';
import { PresenceGateway } from './presence.gateway';
import { YjsGateway } from './yjs.gateway';
import { NotificationModule } from '../notification/notification.module';
import { TeamModule } from '../team/team.module';
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Note.name, schema: NoteSchema },
      { name: NoteHistory.name, schema: NoteHistorySchema },
      { name: Comment.name, schema: CommentSchema },
      { name: Presence.name, schema: PresenceSchema },
      
    ]),
    NotificationModule,
    TeamModule,
  ],
  providers: [NoteService, PresenceService, PresenceGateway,YjsGateway],
  exports: [NoteService],
})
export class NoteModule {}
