import { users } from '@lobechat/database/schemas';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

import { UsageRecordModel, UserSubscriptionModel } from '@/database/models/subscription';
import { UserModel } from '@/database/models/user';
import { adminProcedure, router } from '@/libs/trpc/lambda';

export const adminUsersRouter = router({
  list: adminProcedure.query(async ({ ctx }) => {
    return new UserSubscriptionModel(ctx.serverDB).listAllWithUsers(500);
  }),

  getUsage: adminProcedure.input(z.object({ userId: z.string() })).query(async ({ ctx, input }) => {
    const usage = new UsageRecordModel(ctx.serverDB);
    return usage.listUserMonth(input.userId);
  }),

  updateSubscription: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        planId: z.string(),
        expireAt: z.string().datetime().optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return new UserSubscriptionModel(ctx.serverDB).upsert({
        expireAt: input.expireAt ? new Date(input.expireAt) : undefined,
        planId: input.planId,
        startAt: new Date(),
        userId: input.userId,
      });
    }),

  setRole: adminProcedure
    .input(z.object({ userId: z.string(), role: z.enum(['admin', 'user']) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.serverDB.update(users).set({ role: input.role }).where(eq(users.id, input.userId));
      return { ok: true };
    }),

  setBan: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        banned: z.boolean(),
        reason: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.serverDB
        .update(users)
        .set({
          banned: input.banned,
          banReason: input.banned ? (input.reason ?? null) : null,
        })
        .where(eq(users.id, input.userId));
      return { ok: true };
    }),

  getDetail: adminProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      const user = await UserModel.findById(ctx.serverDB, input.userId);
      const sub = await new UserSubscriptionModel(ctx.serverDB).getActiveByUser(input.userId);
      return { user, subscription: sub };
    }),
});
