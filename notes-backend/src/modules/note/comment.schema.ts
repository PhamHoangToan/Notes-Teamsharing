import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class Comment extends Document {
  @Prop() noteId!: string;
  @Prop() authorId!: string;
  @Prop({ enum: ['comment', 'mention'] }) type!: string;
  @Prop() text!: string;
  @Prop({ type: Object }) range!: { from: number; to: number };
  @Prop() replyTo!: string;
}

export const CommentSchema = SchemaFactory.createForClass(Comment);
