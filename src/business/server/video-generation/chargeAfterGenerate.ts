import { getServerDB } from '@/database/core/db-adaptor';
import { checkMessageQuota, recordMessageUsage } from '@/server/modules/QuotaGuard';

interface ChargeParams {
  computePriceParams?: { generateAudio?: boolean };
  isError?: boolean;
  /** Total time from task submission to webhook callback (ms) */
  latency?: number;
  metadata: {
    asyncTaskId: string;
    generationBatchId: string;
    modelId: string;
    topicId?: string;
  };
  model: string;
  prechargeResult?: Record<string, unknown>;
  provider: string;
  usage?: { completionTokens: number; totalTokens: number };
  userId: string;
}

/**
 * Record a successful video generation against the user's usage ledger.
 * Shares the image-generation pattern — see image-generation/chargeAfterGenerate
 * for the rationale behind the catch-all fallbacks.
 *
 * Skipped when the caller signals an error-path invocation (`isError=true`)
 * since we only want to record successful generations.
 */
export async function chargeAfterGenerate(params: ChargeParams): Promise<void> {
  if (params.isError) return;

  const { userId, provider, model } = params;

  try {
    const db = await getServerDB();

    let useBoost = false;
    try {
      const decision = await checkMessageQuota(db, userId, provider, model);
      useBoost = decision.useBoost;
    } catch {
      useBoost = false;
    }

    await recordMessageUsage(db, userId, provider, model, { useBoost });
  } catch (err) {
    console.error('[video] chargeAfterGenerate record failed:', err);
  }
}
