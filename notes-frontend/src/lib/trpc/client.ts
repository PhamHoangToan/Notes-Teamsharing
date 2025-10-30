import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from './types';

export const trpc = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: 'http://localhost:4000/trpc', 
      headers: () => {
        try {
          const stored = localStorage.getItem('user');
          if (!stored) return {};

         
          const encoded = encodeURIComponent(stored);

          return {
            'x-user': encoded,
          };
        } catch (err) {
          console.warn(' [trpc.client] Lỗi khi encode user:', err);
          return {};
        }
      },
    }),
  ],
});
