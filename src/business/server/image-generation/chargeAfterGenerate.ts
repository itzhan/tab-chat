import { getServerDB } from '@/database/core/db-adaptor';
import { checkMessageQuota, recordMessageUsage } from '@/server/modules/QuotaGuard';
import { type ModelPerformance, type ModelUsage } from '@/types/index';

interface ChargeParams {
  metadata: {
    asyncTaskId: string;
    generationBatchId: string;
    modelId: string;
    topicId?: string;
  };
  metrics?: ModelPerformance;
  modelUsage?: ModelUsage;
  provider: string;
  userId: string;
}

/**
 * Record a single successful image generation against the caller's usage
 * ledger. Invoked once per generation (not once per batch) by the async
 * worker in `src/server/routers/async/image.ts` after the image has been
 * persisted to storage.
 *
 * Mirrors the chat-path `recordMessageUsage` flow:
 *   - Admins are exempt (handled inside `recordMessageUsage`).
 *   - If the user has a boost pack for this (provider, model), one pack is
 *     consumed; otherwise `usage_records` is incremented by 1.
 *   - `checkMessageQuota` can throw when the user has no plan/quota and no
 *     boost; in that edge case we still record as normal usage so the log
 *     reflects the event (the image already succeeded, withholding the
 *     record just hides traffic from admins).
 */
export async function chargeAfterGenerate(params: ChargeParams): Promise<void> {
  const { userId, provider, metadata } = params;
  const modelId = metadata.modelId;

  try {
    const db = await getServerDB();

    let useBoost = false;
    try {
      const decision = await checkMessageQuota(db, userId, provider, modelId);
      useBoost = decision.useBoost;
    } catch {
      // Quota exceeded / no plan configured — still log the usage event so
      // admins can see it in stats. Don't throw: the image is already done.
      useBoost = false;
    }

    await recordMessageUsage(db, userId, provider, modelId, { useBoost });
  } catch (err) {
    // Recording failures must never bubble up and fail the already-successful
    // generation. Log and move on.
    console.error('[image] chargeAfterGenerate record failed:', err);
  }
}
