import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { File, FileSchema } from './file.schema';
import { FileService } from './file.service';
import { S3Service } from '../../utils/s3.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: File.name, schema: FileSchema }])],
  providers: [FileService, S3Service],
  exports: [FileService, S3Service],
})
export class FileModule {}
