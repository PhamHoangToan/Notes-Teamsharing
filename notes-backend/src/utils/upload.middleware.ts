import * as multer from 'multer';
import { RequestHandler } from 'express';


const upload = (multer as any)({
  storage: (multer as any).memoryStorage(),
});


export const fileUploadMiddleware: RequestHandler = (req, res, next) => {
  upload.single('file')(req, res, (err: any) => {
    if (err) {
      console.error(' [upload.middleware] Lỗi parse multipart:', err);
      return res.status(400).json({ error: 'File upload failed', details: err.message });
    }

    console.log(' [upload.middleware] req.file:', req.file?.originalname);
    console.log(' [upload.middleware] req.body:', req.body);
    next();
  });
};
