import { Injectable } from '@nestjs/common';
import { initTRPC } from '@trpc/server';
import * as trpcExpress from '@trpc/server/adapters/express';

// 🧩 Import services
import { S3Service } from '../utils/s3.service';
import { NoteService } from './note/note.service';
import { UserService } from './user/user.service';
import { NotificationService } from './notification/notification.service';
import { FileService } from './file/file.service';
import { TeamService } from './team/team.service';


import { noteRouter } from './note/note.trpc';
import { userRouter } from './user/user.trpc';
import { createNotificationRouter } from './notification/notification.router';
import { fileRouter } from './file/file.trpc';
import { teamRouter } from '../modules/team/team.trpc';

@Injectable()
export class TrpcRouter {
  constructor(
    private readonly s3Service: S3Service,
    private readonly noteService: NoteService,
    private readonly userService: UserService,
    private readonly notificationService: NotificationService,
    private readonly fileService: FileService,
    private readonly teamService: TeamService,
  ) {}

  createExpressMiddleware() {
    const t = initTRPC.create();

    // 🧩 Tạo appRouter chính
    const appRouter = t.router({
      health: t.procedure.query(() => ({ ok: true })),
      note: noteRouter(this.noteService),
      user: userRouter(this.userService),
      notification: createNotificationRouter(t, this.notificationService),
      file: fileRouter(this.fileService, this.s3Service, this.userService),
      team: teamRouter(t, this.teamService),
    });

    // 🧠 Context
    const trpcHandler = trpcExpress.createExpressMiddleware({
      router: appRouter,
     createContext: ({ req }) => {
  const rawHeader = req.headers['x-user'];
  let user: any = null;

  console.log('=======================');
  console.log('[tRPC Context] 🔹 RAW x-user header:', rawHeader);

  if (rawHeader) {
    try {
      // Nếu header bị encode (bắt đầu bằng %7B) → decode trước khi parse
      const decoded =
        typeof rawHeader === 'string' && rawHeader.startsWith('%7B')
          ? decodeURIComponent(rawHeader)
          : rawHeader;

      console.log('[tRPC Context] 🔹 Decoded header:', decoded);

      user = JSON.parse(decoded as string);

      console.log('[tRPC Context] ✅ Parsed user:', user);

      // Kiểm tra xem user có id/_id không
      if (!user?.id && !user?._id) {
        console.warn('[tRPC Context] ⚠️ user thiếu id hoặc _id:', user);
      }

      // Đảm bảo có trường id
      if (user?._id && !user.id) user.id = user._id;

      // Chỉ log 1 lần
      if (!req.headers['x-user-logged']) {
        console.log('[tRPC Context] 👤 User loaded:', user.email || user.username || user.id);
        req.headers['x-user-logged'] = 'true';
      }
    } catch (err) {
      console.warn('[tRPC Context] ❌ Không parse được x-user:', err);
    }
  } else {
    console.warn('[tRPC Context] ⚠️ Không có header x-user');
  }

  console.log('=======================');

  return { user, req };
},

      batching: { enabled: true },
    });

    return (req, res) => {
      
      if (req.body && typeof req.body === 'object') {
        const firstKey = Object.keys(req.body)[0];
        if (firstKey && req.body[firstKey]?.input) {
          console.log(` [tRPC] Normalizing batched body for procedure "${firstKey}"`);
          req.body = req.body[firstKey].input;
        }
      }

      trpcHandler(req, res);
    };
  }
}
