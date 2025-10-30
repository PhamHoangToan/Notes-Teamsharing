import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { User, UserSchema } from './user.schema';
import { Note, NoteSchema } from '../note/note.schema';
import { UserService } from './user.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Note.name, schema: NoteSchema }, // ✅ Gộp vào cùng mảng
    ]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'supersecretkey',
      signOptions: { expiresIn: '7d' }, // ✅ Token hết hạn sau 7 ngày
    }),
  ],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
