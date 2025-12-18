import { initTRPC } from '@trpc/server';
import { z } from 'zod';
import { UserService } from './user.service';

export const userRouter = (userService: UserService) => {
  const t = initTRPC.create();

  return t.router({
    
 
    searchByName: t.procedure
      .input(z.object({ keyword: z.string() }))
      .query(({ input }) => {
        console.log('[userRouter.searchByName] input:', input);
        return userService.searchByName(input.keyword);
      }),

    register: t.procedure
      .input(
        z.object({
          username: z.string().min(3),
          email: z.string().email(),
          password: z.string().min(6),
        })
      )
      .mutation(async ({ input }) => {
         console.log(' [userRouter.register] START ---------------------------');
    console.log(' [userRouter.register] input:', input);
    console.log(' [userRouter.register] typeof input:', typeof input);
    console.log(' [userRouter.register] keys:', Object.keys(input || {}));
        console.log(' [userRouter.register] Raw input nhận được từ client:', input);
        if (!input) {
          console.warn(' [userRouter.register] Không nhận được input nào!');
        } else {
          console.log('[userRouter.register] username:', input.username);
          console.log(' [userRouter.register] email:', input.email);
          console.log(' [userRouter.register] password length:', input.password?.length);
        }

        try {
          const result = await userService.register(
            input.username,
            input.email,
            input.password
          );
          console.log('[userRouter.register] Đăng ký thành công:', {
            id: result.id,
            username: result.username,
            email: result.email,
          });
          return result;
        } catch (error) {
          console.error(' [userRouter.register] Lỗi khi đăng ký:', error);
          throw error;
        }
      }),

    
    login: t.procedure
      .input(
        z.object({
          email: z.string().email(),
          password: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        console.log('[userRouter.login] Input:', input);

        try {
          const result = await userService.login(input.email, input.password);
          console.log(' [userRouter.login] Đăng nhập thành công:', {
            id: result.id,
            username: result.username,
            email: result.email,
          });
          return result;
        } catch (error) {
          console.error(' [userRouter.login] Lỗi khi đăng nhập:', error);
          throw error;
        }
      }),

   
    getProfile: t.procedure
      .input(z.object({ token: z.string() }))
      .query(async ({ input }) => {
        console.log(' [userRouter.getProfile] Token nhận được:', input.token?.slice(0, 15) + '...');
        try {
          const user = await userService.verifyToken(input.token);
          console.log('[userRouter.getProfile] Xác thực thành công:', user);
          return user;
        } catch (error) {
          console.error(' [userRouter.getProfile] Token không hợp lệ:', error);
          throw error;
        }
      }),

      updateProfile: t.procedure
      .input(
        z.object({
          id: z.string(),
          username: z.string(),
          alias: z.string().optional(),
          email: z.string().email(),
          avatarUrl: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        console.log(' [userRouter.updateProfile] input:', input);
        return userService.updateProfile(input.id, {
          username: input.username,
          alias: input.alias,
          email: input.email,
          avatarUrl: input.avatarUrl,
        });
      }),

      findByEmail: t.procedure
      .input(z.object({ email: z.string().email() }))
      .query(async ({ input }) => {
        return userService.findByEmail(input.email);
      }),
      getProfileWithNotes: t.procedure
  .input(z.object({ userId: z.string() }))
  .query(async ({ input }) => {
    const user = await userService.findById(input.userId);
    if (!user) throw new Error("User not found");

    const notes = await userService.getNotesByUser(input.userId);

    return {
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        alias: user.alias,
        avatarUrl: user.avatarUrl,
        role: user.role,
      },
      notes,
    };
  }),

  });
};
