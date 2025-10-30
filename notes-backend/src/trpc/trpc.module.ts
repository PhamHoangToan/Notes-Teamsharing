import { Module, forwardRef } from '@nestjs/common';
import { TrpcRouter } from '../modules/trpc.router';
import { S3Service } from '../utils/s3.service';


import { NoteModule } from '../modules/note/note.module';
import { UserModule } from '../modules/user/user.module';
import { NotificationModule } from '../modules/notification/notification.module';
import { FileModule } from '../modules/file/file.module'; 
import { TeamModule } from '../modules/team/team.module';
@Module({
  imports: [
    forwardRef(() => NoteModule),
    UserModule,
    NotificationModule,
    FileModule,
    TeamModule,
  ],
  providers: [
    TrpcRouter,
    S3Service, 
  ],
  exports: [TrpcRouter],
})
export class TrpcModule {}
