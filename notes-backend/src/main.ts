// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { TrpcRouter } from './modules/trpc.router';
import { fileUploadMiddleware } from './utils/upload.middleware';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ✅ Bật CORS trước khi đăng ký route
  app.enableCors({
    origin: ['http://localhost:5173'], // Cho phép frontend
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // ✅ Parser cho Express
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
 app.use('/trpc/file.upload', fileUploadMiddleware); 
  // ✅ Đăng ký TRPC endpoint (sau khi enableCors)
  const trpc = app.get(TrpcRouter);
  app.use('/trpc', trpc.createExpressMiddleware());

  const PORT = process.env.PORT || 4000;
  await app.listen(PORT);

  console.log(`🚀 Server ready at http://localhost:${PORT}/trpc`);
}
bootstrap();
