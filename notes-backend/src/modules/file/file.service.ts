import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { File } from './file.schema';
import { S3Service } from '../../utils/s3.service';
import { randomUUID } from 'crypto';

@Injectable()
export class FileService {
  constructor(
    @InjectModel(File.name) private fileModel: Model<File>,
    private readonly s3Service: S3Service
  ) {}

  async uploadFile(noteId: string, uploaderId: string, file: Express.Multer.File) {
  try {
    console.log('📤 [FileService] Start upload to S3...');
    console.log('   - noteId:', noteId);
    console.log('   - uploaderId:', uploaderId);
    console.log('   - file:', file.originalname, file.mimetype, file.size);

    
    const s3Url = await this.s3Service.uploadFile(file);
    console.log('[FileService] S3 uploaded:', s3Url);


    const record = await this.fileModel.create({
      noteId,
      uploaderId,
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
      s3Url,
      createdAt: new Date(),
    });

    console.log(' [FileService] Saved to DB:', record._id);

    return record;
  } catch (err) {
    console.error(' [FileService] Upload error:', err);
    throw err;
  }
}


  async listFiles(noteId: string) {
    return this.fileModel.find({ noteId }).sort({ createdAt: -1 }).lean();
  }

  async deleteFile(fileId: string) {
    return this.fileModel.findByIdAndDelete(fileId);
  }
}
