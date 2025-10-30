import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Note } from '../note/note.schema';

@Schema({ timestamps: true })
export class Notification extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User' })
  userId!: Types.ObjectId; 

  @Prop({ type: Types.ObjectId, ref: 'User' })
  senderId!: Types.ObjectId; 
  @Prop({ type: Types.ObjectId, ref: Note.name }) 
  noteId!: Types.ObjectId; 

  @Prop()
  type!: 'mention' | 'comment';

  @Prop()
  message!: string;

  @Prop({ default: false })
  isRead!: boolean;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
