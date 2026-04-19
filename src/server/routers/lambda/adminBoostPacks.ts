import { z } from 'zod';

import { AppSettingsModel } from '@/database/models/appSettings';
import { BoostPackModel } from '@/database/models/subscription';
import { adminProcedure, router } from '@/libs/trpc/lambda';

export const adminBoostPacksRouter = router({
  list: adminProcedure.query(async ({ ctx }) => {
    return new BoostPackModel(ctx.serverDB).listAll(200);
  }),

  /**
   * Single-model grant (legacy path).
   */
  grant: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        providerId: z.string(),
        modelId: z.string(),
        remainingCount: z.number().int().positive(),
        grantedReason: z.string().optional(),
        expireAt: z.string().datetime().optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return new BoostPackModel(ctx.serverDB).grant({
        expireAt: input.expireAt ? new Date(input.expireAt) : undefined,
        grantedBy: ctx.userId,
        grantedReason: input.grantedReason,
        modelId: input.modelId,
        providerId: input.providerId,
        remainingCount: input.remainingCount,
        userId: input.userId,
      });
    }),

  /**
   * Issue a boost pack from a configured template and pricing tier.
   * The granted row uses a shared-pool `modelIds` array so the given
   * remainingCount is consumed by any of the template's models.
   */
  grantFromTemplate: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        templateId: z.string(),
        quantity: z.number().int().positive(),
        grantedReason: z.string().optional(),
        expireAt: z.string().datetime().optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const templates = await new AppSettingsModel(ctx.serverDB).getBoostPackTemplates();
      const template = templates.find((t) => t.id === input.templateId);
      if (!template) throw new Error(`找不到加油包模板：${input.templateId}`);
      if (!template.models?.length) throw new Error('模板未配置模型');

      const total = input.quantity * template.quotaPerUnit;
      // Use first model as the legacy (providerId, modelId) anchor so old code paths
      // that still reference those columns keep working.
      const anchor = template.models[0];

      return new BoostPackModel(ctx.serverDB).grant({
        expireAt: input.expireAt ? new Date(input.expireAt) : undefined,
        grantedBy: ctx.userId,
        grantedReason:
          input.grantedReason ??
          `template=${template.id} qty=${input.quantity}×${template.quotaPerUnit}`,
        label: template.name,
        modelId: anchor.modelId,
        modelIds: template.models,
        providerId: anchor.providerId,
        remainingCount: total,
        templateId: template.id,
        userId: input.userId,
      } as any);
    }),

  revoke: adminProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    await new BoostPackModel(ctx.serverDB).revoke(input.id);
    return { ok: true };
  }),
});
