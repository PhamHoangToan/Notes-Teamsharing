import { initTRPC } from '@trpc/server';
import { inferAsyncReturnType } from '@trpc/server';
import { CreateExpressContextOptions } from '@trpc/server/adapters/express';
import jwt from 'jsonwebtoken';
import { TRPCError } from '@trpc/server';


export function createContext({ req }: CreateExpressContextOptions) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.split(' ')[1]
    : null;

  if (!token) return { user: null };

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      sub: string;
      email: string;
    };
    return { user: decoded };
  } catch {
    return { user: null };
  }
}

export type Context = inferAsyncReturnType<typeof createContext>;
const t = initTRPC.context<Context>().create();


export const authMiddleware = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Token không hợp lệ hoặc thiếu' });
  }
  return next({ ctx: { user: ctx.user } });
});


export const isAuth = t.procedure.use(authMiddleware);
export { t };
