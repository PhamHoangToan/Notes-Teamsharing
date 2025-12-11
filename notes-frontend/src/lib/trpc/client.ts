import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from './types';

/**
 * 🧠 Phát hiện môi trường và trả base URL phù hợp
 * - Khi SSR: không có window → fallback sang 10.0.2.2 hoặc localhost
 * - Khi chạy Capacitor: dùng 10.0.2.2 để kết nối backend local
 * - Khi web: dùng origin hiện tại
 */
function getBaseUrl() {
  if (typeof window === 'undefined') {
    // SSR / build time
    return 'http://10.0.2.2:4000';
  }

  // Capacitor runtime (Android emulator)
  if (window.Capacitor) {
    return 'http://10.0.2.2:4000';
  }

  // Web browser
  return window.location.origin || 'http://localhost:4000';
}

export const trpc = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${getBaseUrl()}/trpc`,

      headers() {
        // Khi SSR, không có localStorage
        if (typeof window === 'undefined') return {};

        try {
          const stored = localStorage.getItem('user');
          if (!stored) return {};

          JSON.parse(stored);
          return { 'x-user': stored };
        } catch (err) {
          console.error('[tRPC Client] ❌ Lỗi khi đọc user từ localStorage:', err);
          return {};
        }
      },
    }),
  ],
});
