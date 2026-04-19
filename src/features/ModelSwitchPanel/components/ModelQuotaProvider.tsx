'use client';

import { createContext, memo, type ReactNode, useMemo } from 'react';
import useSWR from 'swr';

import { subscriptionService } from '@/services/subscription';
import type { EnabledProviderWithModels } from '@/types/aiProvider';

export interface QuotaEntry {
  boostRemaining: number;
  monthlyLimit: number | null;
  used: number;
}

interface ModelQuotaContextValue {
  getQuota: (providerId: string, modelId: string) => QuotaEntry | null | undefined;
  isLoading: boolean;
}

const ModelQuotaContext = createContext<ModelQuotaContextValue>({
  getQuota: () => undefined,
  isLoading: false,
});

const key = (p: string, m: string) => `${p}:::${m}`;

interface ProviderProps {
  children: ReactNode;
  enabledList: EnabledProviderWithModels[];
}

export const ModelQuotaProvider = memo<ProviderProps>(({ enabledList, children }) => {
  // Flatten provider × model pairs once per render — stable because enabledList is memoized upstream
  const pairs = useMemo(() => {
    const out: Array<{ providerId: string; modelId: string }> = [];
    for (const provider of enabledList) {
      for (const model of provider.children ?? []) {
        out.push({ providerId: provider.id, modelId: model.id });
      }
    }
    return out;
  }, [enabledList]);

  const cacheKey = useMemo(
    () => ['modelQuotaBatch', pairs.map((p) => key(p.providerId, p.modelId)).join(',')],
    [pairs],
  );

  const { data, isLoading } = useSWR(
    pairs.length > 0 ? cacheKey : null,
    () => subscriptionService.myModelQuotaBatch(pairs),
    {
      // Moderate revalidation: quota is semi-dynamic; this matches QuotaBadge's cadence
      refreshInterval: 60_000,
      revalidateOnFocus: true,
    },
  );

  const value = useMemo<ModelQuotaContextValue>(() => {
    const map = new Map<string, QuotaEntry | null>();
    if (Array.isArray(data)) {
      data.forEach((entry, idx) => {
        const pair = pairs[idx];
        if (!pair) return;
        map.set(key(pair.providerId, pair.modelId), entry);
      });
    }
    return {
      getQuota: (providerId, modelId) => map.get(key(providerId, modelId)),
      isLoading,
    };
  }, [data, pairs, isLoading]);

  return <ModelQuotaContext value={value}>{children}</ModelQuotaContext>;
});

ModelQuotaProvider.displayName = 'ModelQuotaProvider';

export const useModelQuota = (providerId?: string, modelId?: string) => {
  const ctx = use(ModelQuotaContext);
  if (!providerId || !modelId) return undefined;
  return ctx.getQuota(providerId, modelId);
};
