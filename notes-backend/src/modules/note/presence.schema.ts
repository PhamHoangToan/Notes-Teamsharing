import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class Presence extends Document {
  @Prop() noteId!: string;
  @Prop() userId!: string;
  @Prop() connectionId!: string;
  @Prop({ enum: ['online', 'offline'], default: 'offline' }) status!: string;
  @Prop({ type: Object }) cursor!: { position: number; color: string };
  @Prop() lastSeen!: Date;
}
export const PresenceSchema = SchemaFactory.createForClass(Presence);
