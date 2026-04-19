import { TRPCError } from '@trpc/server';

import {
  BoostPackModel,
  SubscriptionPlanModel,
  UsageRecordModel,
  UserSubscriptionModel,
} from '@/database/models/subscription';
import { UserModel } from '@/database/models/user';
import type { LobeChatDatabase } from '@/database/type';

export const QUOTA_EXCEEDED_CODE = 'QUOTA_EXCEEDED' as const;

export interface QuotaCheckResult {
  /** Count already consumed this month (from usage_records) */
  consumed: number;
  /** Current monthly plan limit (0 = unlimited) */
  monthlyLimit: number;
  /** Whether this call is served by consuming a boost pack */
  useBoost: boolean;
}

/**
 * Check whether a user may send ONE more message of a given model.
 * Throws TRPCError FORBIDDEN with message 'QUOTA_EXCEEDED' when rejected.
 */
export const checkMessageQuota = async (
  db: LobeChatDatabase,
  userId: string,
  providerId: string,
  modelId: string,
): Promise<QuotaCheckResult> => {
  // 0) Admin exemption — operators are never rate-limited.
  const user = await UserModel.findById(db, userId);
  if (user?.role === 'admin') {
    return { consumed: 0, monthlyLimit: 0, useBoost: false };
  }

  const subModel = new UserSubscriptionModel(db);
  const planModel = new SubscriptionPlanModel(db);
  const usageModel = new UsageRecordModel(db);
  const boostModel = new BoostPackModel(db);

  // 1) ensure the user has an active subscription (default plan if none)
  const subscription = await subModel.ensureDefault(userId);
  if (!subscription) {
    // No default plan defined — deny to force admin to configure
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: `${QUOTA_EXCEEDED_CODE}:no_plan`,
    });
  }

  // 2) look up model quota
  let quota = await planModel.getModelQuota(subscription.planId, providerId, modelId);
  if (!quota) {
    // fallback to wildcard '*'/'*'
    quota = await planModel.getModelQuota(subscription.planId, '*', '*');
  }
  const monthlyLimit = quota?.monthlyLimit ?? 0;
  const consumed = await usageModel.getCurrentMonthCount(userId, providerId, modelId);

  // 3) unlimited
  if (monthlyLimit === 0 && !!quota) {
    return { consumed, monthlyLimit: 0, useBoost: false };
  }

  // 4) no quota row at all — treat as not-allowed (admin must configure)
  if (!quota) {
    const boosts = await boostModel.listActive(userId, providerId, modelId);
    if (boosts.length > 0) {
      return { consumed, monthlyLimit: 0, useBoost: true };
    }
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: `${QUOTA_EXCEEDED_CODE}:no_quota`,
    });
  }

  // 5) within plan
  if (consumed < monthlyLimit) {
    return { consumed, monthlyLimit, useBoost: false };
  }

  // 6) plan exhausted — try boost pack
  const boosts = await boostModel.listActive(userId, providerId, modelId);
  if (boosts.length > 0) {
    return { consumed, monthlyLimit, useBoost: true };
  }

  throw new TRPCError({
    code: 'FORBIDDEN',
    message: `${QUOTA_EXCEEDED_CODE}:plan_exceeded`,
  });
};

/**
 * Record usage after a successful message creation.
 * If `useBoost=true`, decrement one boost pack; otherwise +1 on usage_records.
 */
export const recordMessageUsage = async (
  db: LobeChatDatabase,
  userId: string,
  providerId: string,
  modelId: string,
  opts: { useBoost: boolean },
) => {
  // Admin exempt — don't record usage for operators.
  const user = await UserModel.findById(db, userId);
  if (user?.role === 'admin') return;

  if (opts.useBoost) {
    const boostModel = new BoostPackModel(db);
    const consumed = await boostModel.consumeOne(userId, providerId, modelId);
    if (consumed) return;
    // fallback: if boost disappeared, count as normal usage
  }
  await new UsageRecordModel(db).increment(userId, providerId, modelId);
};
