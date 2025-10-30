import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class User extends Document {
  @Prop({ required: true })
  username!: string;

  @Prop({ required: true, unique: true })
  email!: string;

  @Prop()
  passwordHash!: string;

  @Prop()
  avatarUrl!: string;

  @Prop({ default: 'user' })
  role!: string;
  @Prop()
  alias?: string;
}
export const UserSchema = SchemaFactory.createForClass(User);
