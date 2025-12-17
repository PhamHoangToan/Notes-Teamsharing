// src/modules/notification/notification.router.ts
import { z } from 'zod';
import { NotificationService } from './notification.service';
import { TRPCError } from '@trpc/server';

export function createNotificationRouter(t, notificationService: NotificationService) {
  return t.router({
    
    list: t.procedure.query(async ({ ctx }) => {
      console.log(' [notification.list] Bắt đầu xử lý request...');

      if (!ctx.user?.id) {
        console.warn(' [notification.list] Thiếu ctx.user hoặc user.id:', ctx.user);
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Bạn chưa đăng nhập',
        });
      }

      const userId = ctx.user.id;
      console.log(` [notification.list] Lấy danh sách thông báo cho userId=${userId}`);

      try {
        const list = await notificationService.getByUser(userId);
        console.log(` [notification.list] Trả về ${list.length} thông báo`);
        return list;
      } catch (err) {
        console.error('[notification.list] Lỗi khi lấy danh sách thông báo:', err);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Không thể lấy danh sách thông báo',
        });
      }
    }),

    
    markAsRead: t.procedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input }) => {
        console.log(`[notification.markAsRead] Nhận yêu cầu đánh dấu đã đọc:`, input);

        try {
          const result = await notificationService.markAsRead(input.id);
          console.log('[notification.markAsRead] Đã cập nhật thành công:', result?._id || input.id);
          return result;
        } catch (err) {
          console.error('[notification.markAsRead] Lỗi khi cập nhật:', err);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Không thể đánh dấu thông báo đã đọc',
          });
        }
      }),
  });
}
