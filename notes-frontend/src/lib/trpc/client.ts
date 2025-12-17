import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from './types';


function getBaseUrl() {
  return 'http://localhost:4000';
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
          console.error('[tRPC Client]  Lỗi khi đọc user từ localStorage:', err);
          return {};
        }
      },
    }),
  ],
});
