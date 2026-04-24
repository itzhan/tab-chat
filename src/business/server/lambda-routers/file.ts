import { globalFiles } from '@lobechat/database/schemas';
import { TRPCError } from '@trpc/server';
import { eq, sql } from 'drizzle-orm';

import { getServerDB } from '@/database/core/db-adaptor';
import { SubscriptionPlanModel, UserSubscriptionModel } from '@/database/models/subscription';
import { fileEnv } from '@/envs/file';

export const STORAGE_QUOTA_EXCEEDED = 'STORAGE_QUOTA_EXCEEDED';
export const FILE_TOO_LARGE = 'FILE_TOO_LARGE';

export interface BusinessFileUploadCheckParams {
  actualSize: number;
  clientIp?: string;
  inputSize: number;
  url: string;
  userId: string;
}

/**
 * Enforce, in order:
 *   1. Per-file absolute size cap (FILE_MAX_UPLOAD_SIZE_MB). Runs first so a
 *      single huge upload gets rejected even before we hit the DB for quota.
 *   2. Per-user plan storage quota (`subscriptionPlans.storageQuotaBytes`).
 *      Quota = 0 or no plan → skip this leg.
 *
 * Both layers are additive: a user with generous quota still can't upload a
 * 10GB file, and a user on a tiny plan still gets blocked by the quota even
 * if the single file is under the cap.
 */
export async function businessFileUploadCheck(
  params: BusinessFileUploadCheckParams,
): Promise<void> {
  const { actualSize, userId } = params;
  if (actualSize <= 0) return;

  // Layer 1: per-file cap (env-driven, deployment-wide)
  const maxMB = fileEnv.FILE_MAX_UPLOAD_SIZE_MB;
  if (maxMB > 0) {
    const maxBytes = maxMB * 1024 * 1024;
    if (actualSize > maxBytes) {
      throw new TRPCError({
        code: 'PAYLOAD_TOO_LARGE',
        message: `${FILE_TOO_LARGE}:${maxBytes}:${actualSize}`,
      });
    }
  }

  // Layer 2: per-user plan quota
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
