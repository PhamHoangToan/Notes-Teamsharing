import { Injectable } from "@nestjs/common";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { ConfigService } from "@nestjs/config";
import { randomUUID } from "crypto";

@Injectable()
export class S3Service {
  private s3: S3Client;
  private bucket: string;
  private region: string;

  constructor(private config: ConfigService) {
    this.region = this.config.get<string>("S3_REGION") as string;
    this.bucket = this.config.get<string>("S3_BUCKET") as string;

    console.log(" [S3Service] Initializing S3 Client...");
    console.log("   - Bucket:", this.bucket);
    console.log("   - Region:", this.region);

    this.s3 = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: this.config.get<string>("S3_ACCESS_KEY") as string,
        secretAccessKey: this.config.get<string>("S3_SECRET_KEY") as string,
      },
    });

    console.log(" [S3Service] S3 Client initialized successfully.");
  }

  async uploadFile(file: Express.Multer.File) {
    const key = `uploads/${Date.now()}-${randomUUID()}-${file.originalname}`;

    console.log(" [S3Service] Starting upload...");
    console.log("   - File name:", file.originalname);
    console.log("   - MIME type:", file.mimetype);
    console.log("   - File size:", file.size, "bytes");
    console.log("   - Bucket:", this.bucket);
    console.log("   - Region:", this.region);
    console.log("   - Key:", key);

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        
      });

      await this.s3.send(command);

      const url = `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
      console.log("[S3Service] Upload successful!");
      console.log("   - URL:", url);

      return { key, url };
    } catch (err) {
      console.error(" [S3Service] Upload failed!");
      console.error("   - Error name:", err.name);
      console.error("   - Error message:", err.message);
      console.error("   - Stack:", err.stack);
      throw err;
    }
  }

  
}
