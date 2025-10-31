import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from './types';

// 🚀 Tự động đọc user từ localStorage và gửi qua header x-user
export const trpc = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: 'http://localhost:4000/trpc',

      headers() {
        // ✅ Tránh crash khi SSR hoặc chưa có window
        if (typeof window === 'undefined') {
          return {};
        }

        try {
          const stored = localStorage.getItem('user');

          if (!stored) {
            // Không có user => không gửi header
            console.warn('[tRPC Client] ⚠️ Không tìm thấy user trong localStorage');
            return {};
          }

          // Kiểm tra JSON hợp lệ
          JSON.parse(stored);

          // Gửi thẳng JSON string (server đã handle decode)
          console.log('[tRPC Client] 📤 Gửi header x-user:', stored);
          return { 'x-user': stored };
        } catch (err) {
          console.error('[tRPC Client] ❌ Lỗi khi đọc user từ localStorage:', err);
          return {};
        }
      },
    }),
  ],
});
