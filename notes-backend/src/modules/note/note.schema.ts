import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Note extends Document {
  @Prop() teamId!: string;
  @Prop() ownerId!: string;
  @Prop() title!: string;
  @Prop() content!: string;
  @Prop({ type: Buffer }) yDoc!: Buffer;
  @Prop([String]) mentions!: string[];
  @Prop([String]) attachments!: string[];
  @Prop([
    {
      userId: String,
      role: { type: String, enum: ['editor', 'viewer'] },
      lastActive: Date,
    },
  ])
  collaborators!: any[];
  @Prop() isPinned!: boolean;
  @Prop() isArchived!: boolean;
   @Prop({ default: false })
  isPublic!: boolean;
  createdAt!: Date;
  updatedAt!: Date;
}

export const NoteSchema = SchemaFactory.createForClass(Note);
