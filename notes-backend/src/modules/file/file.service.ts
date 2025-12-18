import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { File } from './file.schema';
import { S3Service } from '../../utils/s3.service';

@Injectable()
export class FileService {
  private readonly logger = new Logger(FileService.name);

  constructor(
    @InjectModel(File.name) private readonly fileModel: Model<File>,
    private readonly s3Service: S3Service,
  ) {}

  // ============================================================
  //  Upload file
  // ============================================================
  async uploadFile(
    noteId: string,
    uploaderId: string,
    file: Express.Multer.File,
  ) {
    this.logger.log('📤 [FileService] Bắt đầu upload file lên S3...');
    this.logger.debug(`🧾 noteId=${noteId}`);
    this.logger.debug(` uploaderId=${uploaderId}`);
    this.logger.debug(
      ` file=${file.originalname}, type=${file.mimetype}, size=${file.size}`,
    );

    try {
      // 1️⃣ Upload lên S3
      const s3Url = await this.s3Service.uploadFile(file);
      this.logger.log(`🪣 [S3] Upload thành công: ${JSON.stringify(s3Url)}`);

      // 2️⃣ Lưu record vào MongoDB
      const record = await this.fileModel.create({
        noteId,
        uploaderId,
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        s3Url,
        createdAt: new Date(),
      });

      this.logger.log(` [FileService] Lưu vào DB thành công: _id=${record._id}`);
      return record;
    } catch (err) {
      this.logger.error(
        ` [FileService] Upload error: ${err.message || err}`,
        err.stack,
      );
      throw err;
    }
  }

  // ============================================================
  //  Lấy danh sách file theo noteId
  // ============================================================
  async getFilesByNoteId(noteId: string) {
    this.logger.log(`📄 [FileService] Truy vấn file cho noteId=${noteId}`);

    if (!noteId || typeof noteId !== 'string') {
      this.logger.warn(` noteId không hợp lệ: ${noteId}`);
      throw new Error('noteId không hợp lệ');
    }

    try {
      const files = await this.fileModel
        .find({ noteId })
        .sort({ createdAt: -1 })
        .lean();

      this.logger.log(
        ` [FileService] Tìm thấy ${files?.length || 0} file cho noteId=${noteId}`,
      );

      if (files?.length) {
        files.forEach((f, i) => {
          this.logger.debug(
            `🧾 [${i + 1}] ${f.fileName} | MIME=${f.mimeType} | Size=${
              f.fileSize || '?'
            }`,
          );
        });
      }

      return files;
    } catch (err) {
      this.logger.error(
        ` [FileService] Lỗi khi lấy file theo noteId=${noteId}: ${err.message}`,
        err.stack,
      );
      throw err;
    }
  }

  // ============================================================
  //  Lấy danh sách file (cơ bản)
  // ============================================================
  async listFiles(noteId: string) {
    this.logger.log(`📜 [FileService] listFiles noteId=${noteId}`);
    return this.fileModel.find({ noteId }).sort({ createdAt: -1 }).lean();
  }

  // ============================================================
  //  Xóa file theo ID
  // ============================================================
  async deleteFile(id: string): Promise<void> {
    this.logger.log(` [Service] Bắt đầu xóa file id=${id}`);

    // 1️⃣ Tìm file trong DB
    const file = await this.fileModel.findById(id).exec();
    if (!file) {
      this.logger.warn(` [Service] Không tìm thấy file id=${id} trong DB`);
      throw new NotFoundException(`Không tìm thấy file với id=${id}`);
    }

    // 2️⃣ Xóa file trên S3 (nếu có URL)
    try {
      const s3Url =
        typeof file.s3Url === 'string' ? file.s3Url : file.s3Url?.url || null;

      if (s3Url) {
        this.logger.log(`🌐 [S3] Đang xóa file trên S3: ${s3Url}`);
        await this.s3Service.deleteFileByUrl(s3Url);
        this.logger.log(` [S3] Đã xóa file thành công khỏi S3`);
      } else {
        this.logger.warn(` [S3] File id=${id} không có s3Url, bỏ qua bước xóa S3`);
      }
    } catch (s3Err) {
      this.logger.error(
        ` [S3] Lỗi khi xóa file trên S3: ${s3Err.message}`,
        s3Err.stack,
      );
      // Không throw để vẫn xóa khỏi DB
    }

    // 3️⃣ Xóa record trong MongoDB
    try {
      await this.fileModel.findByIdAndDelete(id).exec();
      this.logger.log(` [DB] Đã xóa file id=${id} khỏi Database`);
    } catch (dbErr) {
      this.logger.error(
        ` [DB] Không thể xóa file id=${id}: ${dbErr.message}`,
        dbErr.stack,
      );
      throw dbErr;
    }
  }
}
