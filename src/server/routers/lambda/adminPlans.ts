import { z } from 'zod';

import { SubscriptionPlanModel } from '@/database/models/subscription';
import { adminProcedure, router } from '@/libs/trpc/lambda';

const planSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().min(1).max(128),
  description: z.string().optional().nullable(),
  storageQuotaBytes: z.number().int().nonnegative().default(0),
  isDefault: z.boolean().default(false),
  enabled: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

const updatePlanSchema = planSchema.partial().extend({ id: z.string() });

const modelQuotaSchema = z.object({
  planId: z.string(),
  providerId: z.string(),
  modelId: z.string(),
  monthlyLimit: z.number().int().nonnegative(),
});

export const adminPlansRouter = router({
  list: adminProcedure.query(async ({ ctx }) => {
    return new SubscriptionPlanModel(ctx.serverDB).list();
  }),

  create: adminProcedure.input(planSchema).mutation(async ({ ctx, input }) => {
    return new SubscriptionPlanModel(ctx.serverDB).create(input);
  }),

  update: adminProcedure.input(updatePlanSchema).mutation(async ({ ctx, input }) => {
    const { id, ...rest } = input;
    return new SubscriptionPlanModel(ctx.serverDB).update(id, rest);
  }),

  delete: adminProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    return new SubscriptionPlanModel(ctx.serverDB).delete(input.id);
  }),

  listModelQuotas: adminProcedure
    .input(z.object({ planId: z.string() }))
    .query(async ({ ctx, input }) => {
      return new SubscriptionPlanModel(ctx.serverDB).listModelQuotas(input.planId);
    }),

  upsertModelQuota: adminProcedure.input(modelQuotaSchema).mutation(async ({ ctx, input }) => {
    return new SubscriptionPlanModel(ctx.serverDB).upsertModelQuota(input);
  }),

  deleteModelQuota: adminProcedure
    .input(z.object({ planId: z.string(), providerId: z.string(), modelId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return new SubscriptionPlanModel(ctx.serverDB).deleteModelQuota(
        input.planId,
        input.providerId,
        input.modelId,
      );
    }),
});
