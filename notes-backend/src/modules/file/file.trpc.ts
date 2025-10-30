import { initTRPC } from '@trpc/server';
import { z } from 'zod';
import { FileService } from './file.service';
import { S3Service } from '../../utils/s3.service';
import { UserService } from '../user/user.service';

const t = initTRPC.create();


export function fileRouter(
  fileService: FileService,
  s3Service: S3Service,
  userService: UserService
) {
  return t.router({
    
    uploadUrl: t.procedure
      .input(z.object({ fileName: z.string() }))
      .mutation(async ({ input }) => {
        const key = `uploads/${Date.now()}-${input.fileName}`;
        const url = `https://${process.env.S3_BUCKET}.s3.${process.env.S3_REGION}.amazonaws.com/${key}`;
        return { key, url };
      }),

    
    upload: t.procedure.mutation(async ({ ctx }) => {
      const req = ctx.req as any;
      const file = req.file;
      const uploaderId = req.body?.uploaderId;
      const noteId = req.body?.noteId || 'none';

      if (!file) throw new Error(' No file provided');
      if (!uploaderId) throw new Error(' Missing uploaderId');

      console.log(' [file.upload] Start upload...');
      console.log('   - uploaderId:', uploaderId);
      console.log('   - file:', file.originalname, file.mimetype, file.size);

      
      const saved = await fileService.uploadFile(noteId, uploaderId, file);

      
      const s3Url =
        typeof saved.s3Url === 'object' && saved.s3Url.url
          ? saved.s3Url.url
          : typeof saved.s3Url === 'string'
          ? saved.s3Url
          : `https://${process.env.S3_BUCKET}.s3.${process.env.S3_REGION}.amazonaws.com/${saved.s3Key}`;

      console.log('[file.upload] returning s3Url:', s3Url);

    
      try {
        await userService.updateProfile(uploaderId, { avatarUrl: s3Url });
        console.log(' [file.upload] Updated user avatar via UserService');
      } catch (err) {
        console.error(' [file.upload] Error updating user avatar:', err);
      }

  
      return {
        s3Url, 
        result: {
          data: { s3Url }, 
        },
      };
    }),
  });
}
