import { globalFiles } from '@lobechat/database/schemas';
import { TRPCError } from '@trpc/server';
import { eq, sql } from 'drizzle-orm';

import { getServerDB } from '@/database/core/db-adaptor';
import { SubscriptionPlanModel, UserSubscriptionModel } from '@/database/models/subscription';

export const STORAGE_QUOTA_EXCEEDED = 'STORAGE_QUOTA_EXCEEDED';

export interface BusinessFileUploadCheckParams {
  actualSize: number;
  clientIp?: string;
  inputSize: number;
  url: string;
  userId: string;
}

/**
 * Block upload when the user's plan storage quota would be exceeded.
 * Quota = 0 means unlimited.
 */
export async function businessFileUploadCheck(
  params: BusinessFileUploadCheckParams,
): Promise<void> {
  const { actualSize, userId } = params;
  if (actualSize <= 0) return;

  const db = await getServerDB();

  const subscription = await new UserSubscriptionModel(db).ensureDefault(userId);
  if (!subscription) return; // no plan set up yet — allow by default

  const plan = await new SubscriptionPlanModel(db).getById(subscription.planId);
  if (!plan || !plan.storageQuotaBytes || plan.storageQuotaBytes === 0) return;

  const rows = await db
    .select({ total: sql<number>`COALESCE(SUM(${globalFiles.size}), 0)` })
    .from(globalFiles)
    .where(eq(globalFiles.creator, userId));
  const used = Number(rows[0]?.total ?? 0);

  if (used + actualSize > plan.storageQuotaBytes) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: `${STORAGE_QUOTA_EXCEEDED}:${plan.storageQuotaBytes}:${used}`,
    });
  }
}
