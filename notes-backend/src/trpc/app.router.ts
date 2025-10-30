import { initTRPC } from '@trpc/server';
import { noteRouter } from '../modules/note/note.trpc';
import { userRouter } from '../modules/user/user.trpc';
import { createFileRouter } from '../modules/file/file.trpc';  

import { NoteService } from '../modules/note/note.service';
import { UserService } from '../modules/user/user.service';
import { FileService } from '../modules/file/file.service'; 
import { S3Service } from '../utils/s3.service'; 

const t = initTRPC.create();


export function createAppRouter(
  noteService: NoteService,
  userService: UserService,
  fileService: FileService, 
  s3Service: S3Service 
) {
  return t.router({
    note: noteRouter(noteService),
    user: userRouter(userService),
    file: createFileRouter(fileService, s3Service),  
  });
}

export type AppRouter = ReturnType<typeof createAppRouter>;
