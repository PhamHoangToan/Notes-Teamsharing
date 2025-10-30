import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class File extends Document {
  @Prop() noteId!: string;

  @Prop() uploaderId!: string;

  @Prop() fileName!: string;

  @Prop() fileSize!: number;

  @Prop() mimeType!: string;

  
  @Prop() s3Key!: string;

  
  @Prop({ type: Object })
  s3Url!: { key: string; url: string };
}

export const FileSchema = SchemaFactory.createForClass(File);
