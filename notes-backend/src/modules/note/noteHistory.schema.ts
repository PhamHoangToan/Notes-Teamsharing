import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class NoteHistory extends Document {
  @Prop() noteId!: string;
   @Prop({ type: Types.ObjectId, ref: 'User' })
editorId!: Types.ObjectId;
  @Prop() snapshot!: string;
  @Prop({ type: Object })
  diff!: Record<string, any>;
}
export const NoteHistorySchema = SchemaFactory.createForClass(NoteHistory);
