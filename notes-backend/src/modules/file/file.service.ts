import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { File } from './file.schema';
import { S3Service } from '../../utils/s3.service';

@Injectable()
export class FileService {
  private readonly logger = new Logger(FileService.name); // ✅ Thêm logger

  constructor(
    @InjectModel(File.name) private readonly fileModel: Model<File>,
    private readonly s3Service: S3Service,
  ) {}

  // ============================================================
  // 🔹 Upload file
  // ============================================================
  async uploadFile(
    noteId: string,
    uploaderId: string,
    file: Express.Multer.File,
  ) {
    this.logger.log('📤 [FileService] Bắt đầu upload file lên S3...');
    this.logger.debug(`🧾 noteId=${noteId}`);
    this.logger.debug(`👤 uploaderId=${uploaderId}`);
    this.logger.debug(
      `📎 file=${file.originalname}, type=${file.mimetype}, size=${file.size}`,
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

      this.logger.log(`✅ [FileService] Lưu vào DB thành công: _id=${record._id}`);
      return record;
    } catch (err) {
      this.logger.error(
        `❌ [FileService] Upload error: ${err.message || err}`,
        err.stack,
      );
      throw err;
    }
  }

  // ============================================================
  // 🔹 Lấy danh sách file theo noteId
  // ============================================================
  async getFilesByNoteId(noteId: string) {
    this.logger.log(`📄 [FileService] Truy vấn file cho noteId=${noteId}`);

    if (!noteId || typeof noteId !== 'string') {
      this.logger.warn(`⚠️ noteId không hợp lệ: ${noteId}`);
      throw new Error('noteId không hợp lệ');
    }

    try {
      const files = await this.fileModel
        .find({ noteId })
        .sort({ createdAt: -1 })
        .lean();

      this.logger.log(
        `✅ [FileService] Tìm thấy ${files?.length || 0} file cho noteId=${noteId}`,
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
        `❌ [FileService] Lỗi khi lấy file theo noteId=${noteId}: ${err.message}`,
        err.stack,
      );
      throw err;
    }
  }

  // ============================================================
  // 🔹 Lấy danh sách file (cơ bản)
  // ============================================================
  async listFiles(noteId: string) {
    this.logger.log(`📜 [FileService] listFiles noteId=${noteId}`);
    return this.fileModel.find({ noteId }).sort({ createdAt: -1 }).lean();
  }

  // ============================================================
  // 🔹 Xóa file theo fileId
  // ============================================================
  async deleteFile(fileId: string) {
    this.logger.log(`🗑️ [FileService] Xóa fileId=${fileId}`);
    return this.fileModel.findByIdAndDelete(fileId);
  }
}
