import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Presence extends Document {
  @Prop({ required: true })
  noteId!: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId!: Types.ObjectId; //  Đúng kiểu Mongo ObjectId

  @Prop({ required: true })
  connectionId!: string;

  @Prop({ enum: ['online', 'offline'], default: 'offline' })
  status!: string;

  @Prop({ type: Object, default: { position: 0, color: '#000' } })
  cursor!: { position: number; color: string };

  @Prop({ default: Date.now })
  lastSeen!: Date;
}

export const PresenceSchema = SchemaFactory.createForClass(Presence);

//  Tối ưu hiệu năng
PresenceSchema.index({ noteId: 1, userId: 1 });
