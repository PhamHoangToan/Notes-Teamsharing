import { S3Client } from "@aws-sdk/client-s3";
import { ConfigService } from "@nestjs/config";
import { AwsCredentialIdentity } from "@aws-sdk/types";

export const createS3Client = (configService: ConfigService) => {
  const region = configService.get<string>("S3_REGION")!;
  const accessKeyId = configService.get<string>("S3_ACCESS_KEY")!;
  const secretAccessKey = configService.get<string>("S3_SECRET_KEY")!;

  const credentials: AwsCredentialIdentity = {
    accessKeyId,
    secretAccessKey,
  };

  return new S3Client({
    region,
    credentials,
  });
};
