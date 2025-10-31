import {
  Controller,
  Get,
  Post,
  Param,
  UseInterceptors,
  UploadedFile,
  Body,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FileService } from './file.service';

@Controller('file')
export class FileController {
  private readonly logger = new Logger(FileController.name);

  constructor(private readonly fileService: FileService) {}

  // ============================================================
  // 🔹 Lấy danh sách file theo noteId (sắp xếp theo thời gian upload)
  // ============================================================
  @Get(':noteId')
  async getFilesByNoteId(@Param('noteId') noteId: string) {
    this.logger.log(`📂 [GET] Yêu cầu lấy danh sách file cho noteId=${noteId}`);

    if (!noteId) {
      this.logger.warn('⚠️ Thiếu noteId trong request');
      throw new BadRequestException('Thiếu noteId');
    }

    try {
      const files = await this.fileService.getFilesByNoteId(noteId);

      if (!files?.length) {
        this.logger.warn(`⚠️ Không tìm thấy file nào cho noteId=${noteId}`);
        return [];
      }

      // 🔽 Sắp xếp file theo thời gian tạo (mới nhất trước)
      const sortedFiles = files.sort(
        (a: any, b: any) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

      this.logger.log(`✅ Trả về ${sortedFiles.length} file cho noteId=${noteId}`);
      sortedFiles.forEach((f, i) =>
        this.logger.debug(
          `🧾 [${i + 1}] ${f.fileName} | ${f.mimeType} | ${f.createdAt}`,
        ),
      );

      // Trả về đầy đủ dữ liệu cần thiết cho frontend
      return sortedFiles.map((f) => ({
        _id: f._id,
        fileName: f.fileName,
        mimeType: f.mimeType,
        noteId: f.noteId,
        uploaderId: f.uploaderId,
        s3Url: f.s3Url?.url || f.s3Url || null,
        createdAt: f.createdAt,
      }));
    } catch (err) {
      this.logger.error(
        `❌ [Controller] Lỗi khi lấy danh sách file cho noteId=${noteId}: ${
          err.message || err
        }`,
      );
      this.logger.debug(err.stack);
      throw err;
    }
  }

  // ============================================================
  // 🔹 Upload file
  // ============================================================
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body('noteId') noteId: string,
    @Body('uploaderId') uploaderId: string,
  ) {
    this.logger.log('📥 [UPLOAD] Nhận request upload file...');
    this.logger.log(`🧾 noteId: ${noteId}`);
    this.logger.log(`👤 uploaderId: ${uploaderId}`);

    if (!file) {
      this.logger.error('❌ Không nhận được file upload!');
      throw new BadRequestException('Không có file nào được gửi lên');
    }

    try {
      const result = await this.fileService.uploadFile(noteId, uploaderId, file);

      const response = {
        message: 'Upload thành công',
        uploadedAt: new Date().toISOString(),
        url:
          result?.url?.url ||
          result?.s3Url?.url ||
          result?.url ||
          result?.s3Url ||
          null,
        fileName: result?.fileName || file.originalname,
        mimeType: result?.mimeType || file.mimetype,
        s3Url: result?.s3Url?.url || result?.s3Url || null,
        _id: result?._id || null,
        createdAt: result?.createdAt || new Date().toISOString(),
      };

      this.logger.log('✅ [UPLOAD] Upload thành công!');
      this.logger.debug(`🪣 S3 URL: ${response.s3Url}`);
      this.logger.debug(`📁 File ID (DB): ${response._id}`);
      this.logger.debug(`📜 fileName: ${response.fileName}`);

      return response;
    } catch (err) {
      this.logger.error(
        `❌ [UPLOAD] Lỗi khi upload file: ${err.message || err}`,
      );
      this.logger.debug(err.stack);
      throw err;
    }
  }
}
