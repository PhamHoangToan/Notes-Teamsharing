// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { TrpcRouter } from './modules/trpc.router';
import { fileUploadMiddleware } from './utils/upload.middleware';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  //  Bật CORS — cho phép tất cả nguồn dùng trong quá trình dev
  app.enableCors({
    origin: [
      'http://localhost:5173',       // Web dev local
      'http://10.0.2.2:5173',        // Android emulator (loopback)
      'http://192.168.1.19:5173',    // LAN IP khi truy cập bằng thiết bị thật
      'capacitor://localhost',       // Capacitor runtime
      'http://localhost',            // fallback
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true
  });

  //  Express parser để xử lý JSON & form-data upload
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  //  Route upload riêng cho tRPC file upload
  app.use('/trpc/file.upload', fileUploadMiddleware);

  //  Đăng ký tRPC endpoint (đặt sau CORS)
  const trpc = app.get(TrpcRouter);
  app.use('/trpc', trpc.createExpressMiddleware());


  const PORT = process.env.PORT || 4000;
  await app.listen(PORT, '0.0.0.0');
  console.log(` Server ready at http://0.0.0.0:${PORT}/trpc`);
}

bootstrap();
