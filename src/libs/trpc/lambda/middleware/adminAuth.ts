import { TRPCError } from '@trpc/server';

import { UserModel } from '@/database/models/user';

import { trpc } from '../init';

/**
 * Requires the authenticated user to have role = 'admin'.
 * Must be chained after `authedProcedure` and `serverDatabase`.
 */
export const adminAuth = trpc.middleware(async (opts) => {
  const { ctx } = opts as any;

  if (!ctx.userId) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }

  if (!ctx.serverDB) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'serverDB middleware missing before adminAuth',
    });
  }

  const user = await UserModel.findById(ctx.serverDB, ctx.userId);
  if (!user || user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
  }

  return opts.next({ ctx: { ...ctx, adminUser: user } });
});
