import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { TrpcModule } from './trpc/trpc.module';
import { UserModule } from './modules/user/user.module';
import { TeamModule } from './modules/team/team.module';
import { NoteModule } from './modules/note/note.module';
import { FileModule } from './modules/file/file.module';
import { NotificationModule } from './modules/notification/notification.module';

@Module({
  imports: [

    ConfigModule.forRoot({ isGlobal: true }),

    MongooseModule.forRoot(process.env.MONGO_URI!),


    UserModule,
    TeamModule,
    FileModule,
    NotificationModule,

  
    forwardRef(() => NoteModule),
    forwardRef(() => TrpcModule),
  ],
})
export class AppModule {}
