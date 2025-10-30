import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Body,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FileService } from './file.service';

@Controller('file')
export class FileController {
  private readonly logger = new Logger(FileController.name);

  constructor(private readonly fileService: FileService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body('noteId') noteId: string,
    @Body('uploaderId') uploaderId: string,
  ) {
    this.logger.log('📥 [UPLOAD] Nhận request upload file...');
    this.logger.debug(`🧾 noteId = ${noteId || '(none)'}`);
    this.logger.debug(`👤 uploaderId = ${uploaderId || '(none)'}`);

    if (!file) {
      this.logger.error('❌ Không nhận được file trong request!');
      throw new Error('Không có file được gửi lên');
    }

    this.logger.log(`📎 file.originalname = ${file.originalname}`);
    this.logger.log(`📦 file.mimetype = ${file.mimetype}`);
    this.logger.log(`📏 file.size = ${file.size} bytes`);

    try {
      // === Upload lên S3 và lưu DB ===
      const result = await this.fileService.uploadFile(noteId, uploaderId, file);

      this.logger.log('✅ [UPLOAD] Upload thành công!');
      this.logger.debug(`🪣 S3 URL: ${result?.url || result?.s3Url?.url}`);
      this.logger.debug(`📁 File ID (DB): ${result?._id || '(chưa lưu DB)'}`);

      // === Chuẩn hóa response để frontend xử lý dễ dàng ===
      const response = {
        success: true,
        message: 'Upload thành công',
        uploadedAt: new Date().toISOString(),
        fileName: result.fileName || file.originalname,
        mimeType: result.mimeType || file.mimetype,
        size: result.fileSize || file.size,
        url: result.url || result?.s3Url?.url, // ✅ luôn có key 'url'
        key: result.key || result?.s3Url?.key,
        noteId,
        uploaderId,
        _id: result._id || null,
      };

      this.logger.verbose(`📤 [UPLOAD RESPONSE]: ${JSON.stringify(response, null, 2)}`);

      return response;
    } catch (err) {
      this.logger.error('❌ [UPLOAD] Lỗi khi upload file:', err.stack || err);
      throw err;
    }
  }
}
