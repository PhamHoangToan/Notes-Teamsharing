import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Team extends Document {
  @Prop() name!: string;
  @Prop() description!: string;
  @Prop() ownerId!: string;
  @Prop([
    {
      userId: String,
      role: { type: String, enum: ['owner', 'editor', 'viewer'], default: 'viewer' },
      joinedAt: Date,
    },
  ])
  members!: any[];
}

export const TeamSchema = SchemaFactory.createForClass(Team);