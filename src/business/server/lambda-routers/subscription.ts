import { z } from 'zod';

import {
  BoostPackModel,
  SubscriptionPlanModel,
  UsageRecordModel,
  UserSubscriptionModel,
} from '@/database/models/subscription';
import { authedProcedure, router } from '@/libs/trpc/lambda';
import { serverDatabase } from '@/libs/trpc/lambda/middleware';
import { checkMessageQuota, recordMessageUsage } from '@/server/modules/QuotaGuard';

const userProc = authedProcedure.use(serverDatabase);

export const subscriptionRouter = router({
  me: userProc.query(async ({ ctx }) => {
    const sub = await new UserSubscriptionModel(ctx.serverDB).ensureDefault(ctx.userId);
    if (!sub) return null;
    const plan = await new SubscriptionPlanModel(ctx.serverDB).getById(sub.planId);
    const quotas = plan
      ? await new SubscriptionPlanModel(ctx.serverDB).listModelQuotas(plan.id)
      : [];
    return { plan, quotas, subscription: sub };
  }),

  myUsage: userProc.query(async ({ ctx }) => {
    return new UsageRecordModel(ctx.serverDB).listUserMonth(ctx.userId);
  }),

  myBoostPacks: userProc.query(async ({ ctx }) => {
    return new BoostPackModel(ctx.serverDB).listByUser(ctx.userId);
  }),

  /**
   * All enabled plans — exposed to logged-in users so they can see what's available.
   * Returns each plan together with its model quotas (for the "包含模型" card content).
   */
  listPlans: userProc.query(async ({ ctx }) => {
    const planModel = new SubscriptionPlanModel(ctx.serverDB);
    const allPlans = await planModel.list();
    const enabled = allPlans.filter((p) => p.enabled);

    const withQuotas = await Promise.all(
      enabled.map(async (plan) => ({
        ...plan,
        modelQuotas: await planModel.listModelQuotas(plan.id),
      })),
    );
    return withQuotas;
  }),

  /**
   * Client-mode only: browser calls this after a successful direct-to-provider fetch
   * so we can deduct quota / consume boost packs. Server-mode deducts in the
   * /webapi/chat/[provider] handler instead.
   */
  recordClientSideUsage: userProc
    .input(z.object({ providerId: z.string(), modelId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Re-run check to make sure the caller still has quota — this also returns
      // the boost-vs-plan decision used for the deduction.
      try {
        const decision = await checkMessageQuota(
          ctx.serverDB,
          ctx.userId,
          input.providerId,
          input.modelId,
        );
        await recordMessageUsage(ctx.serverDB, ctx.userId, input.providerId, input.modelId, {
          useBoost: decision.useBoost,
        });
      } catch {
        // If check fails it means the user exhausted quota mid-flight; that's
        // already rare, and we'd rather not double-charge. Silently no-op.
      }
      return { ok: true };
    }),

  /**
   * User requests an upgrade. No payment yet — records an intent for the admin.
   * For now, simply logs; a later iteration can persist to a `plan_upgrade_requests` table.
   */
  requestUpgrade: userProc
    .input(z.object({ planId: z.string(), note: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      // TODO(payments): persist request so admins can review in the console.
      console.info(
        `[subscription.requestUpgrade] user=${ctx.userId} planId=${input.planId} note=${input.note ?? ''}`,
      );
      return { ok: true };
    }),

  /**
   * User requests to purchase a boost pack at a specific pricing tier.
   * No payment processor yet — records intent; admin grants manually.
   */
  requestBoostPurchase: userProc
    .input(
      z.object({
        templateId: z.string(),
        quantity: z.number().int().positive(),
        note: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // TODO(payments): persist to a purchase_requests table
      console.info(
        `[subscription.requestBoostPurchase] user=${ctx.userId} template=${input.templateId} qty=${input.quantity} note=${input.note ?? ''}`,
      );
      return { ok: true };
    }),

  /**
   * Compact "remaining quota for this specific model" lookup — used by chat UI
   * to render a small "X / Y messages left" hint near the input.
   */
  myModelQuota: userProc
    .input(z.object({ providerId: z.string(), modelId: z.string() }))
    .query(async ({ ctx, input }) => {
      const subscription = await new UserSubscriptionModel(ctx.serverDB).ensureDefault(ctx.userId);
      if (!subscription) return null;

      const planModel = new SubscriptionPlanModel(ctx.serverDB);
      let quota = await planModel.getModelQuota(
        subscription.planId,
        input.providerId,
        input.modelId,
      );
      if (!quota) quota = await planModel.getModelQuota(subscription.planId, '*', '*');

      const used = await new UsageRecordModel(ctx.serverDB).getCurrentMonthCount(
        ctx.userId,
        input.providerId,
        input.modelId,
      );

      const boosts = await new BoostPackModel(ctx.serverDB).listActive(
        ctx.userId,
        input.providerId,
        input.modelId,
      );
      const boostRemaining = boosts.reduce((sum, b) => sum + b.remainingCount, 0);

      return {
        monthlyLimit: quota?.monthlyLimit ?? null, // null = 未配置
        used,
        boostRemaining,
      };
    }),

  /**
   * Batch version of myModelQuota — fetches remaining quota for many (provider, model)
   * pairs in one request, used by the model switcher popup to annotate each option.
   * Returns a plain array mirroring the input order; keys stay client-side to avoid
   * ambiguous identifiers.
   */
  myModelQuotaBatch: userProc
    .input(
      z.object({
        items: z.array(z.object({ providerId: z.string(), modelId: z.string() })).max(200),
      }),
    )
    .query(async ({ ctx, input }) => {
      if (input.items.length === 0) return [];

      const subscription = await new UserSubscriptionModel(ctx.serverDB).ensureDefault(ctx.userId);
      if (!subscription) return input.items.map(() => null);

      const planModel = new SubscriptionPlanModel(ctx.serverDB);
      const usageModel = new UsageRecordModel(ctx.serverDB);
      const boostModel = new BoostPackModel(ctx.serverDB);

      const fallbackQuota = await planModel.getModelQuota(subscription.planId, '*', '*');

      return Promise.all(
        input.items.map(async ({ providerId, modelId }) => {
          const quota =
            (await planModel.getModelQuota(subscription.planId, providerId, modelId)) ??
            fallbackQuota;
          const [used, boosts] = await Promise.all([
            usageModel.getCurrentMonthCount(ctx.userId, providerId, modelId),
            boostModel.listActive(ctx.userId, providerId, modelId),
          ]);
          const boostRemaining = boosts.reduce((sum, b) => sum + b.remainingCount, 0);
          return {
            monthlyLimit: quota?.monthlyLimit ?? null,
            used,
            boostRemaining,
          };
        }),
      );
    }),
});
