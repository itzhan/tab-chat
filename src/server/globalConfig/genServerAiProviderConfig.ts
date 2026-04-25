import { type ProviderConfig } from '@lobechat/types';
import { type AiFullModelCard } from 'model-bank';
import { ModelProvider } from 'model-bank';
import * as AiModels from 'model-bank';

import { getLLMConfig } from '@/envs/llm';
import { extractEnabledModels, transformToAiModelList } from '@/utils/server/parseModels';

interface ProviderSpecificConfig {
  enabled?: boolean;
  enabledKey?: string;
  fetchOnClient?: boolean;
  modelListKey?: string;
  withDeploymentName?: boolean;
}

export const genServerAiProvidersConfig = async (
  specificConfig: Record<any, ProviderSpecificConfig>,
) => {
  const llmConfig = getLLMConfig() as Record<string, any>;

  // Process all providers concurrently. For providers that are disabled AND have no
  // explicit model list env var set, we return a cheap `{ enabled: false }` stub
  // without touching the `extractEnabledModels` / `transformToAiModelList` helpers
  // (which each call `parseModelString` and eventually pull the 15MB `model-bank`
  // module on cold start). In a typical web deployment only 1-2 providers are
  // actually enabled, so this is the biggest single win against cold-start latency.
  const providerConfigs = await Promise.all(
    Object.values(ModelProvider).map(async (provider) => {
      const providerUpperCase = provider.toUpperCase();
      const aiModels = AiModels[provider] as AiFullModelCard[] | undefined;

      const providerConfig = specificConfig[provider as keyof typeof specificConfig] || {};

      // The ModelProvider enum still lists all 79 builtin providers but the
      // curated `aiModels/index.ts` only exports a subset. For providers we
      // didn't ship a catalog for, return a disabled stub instead of throwing
      // — they're still selectable as user-custom providers if needed, just
      // without a default model list.
      if (!aiModels) {
        return {
          config: {
            enabled: false,
            ...(providerConfig.fetchOnClient !== undefined && {
              fetchOnClient: providerConfig.fetchOnClient,
            }),
          },
          provider,
        };
      }
      const modelString =
        process.env[providerConfig.modelListKey ?? `${providerUpperCase}_MODEL_LIST`];

      const enabled =
        typeof providerConfig.enabled !== 'undefined'
          ? providerConfig.enabled
          : llmConfig[providerConfig.enabledKey || `ENABLED_${providerUpperCase}`];

      // Fast path: nothing to compute.
      if (!enabled && !modelString) {
        return {
          config: {
            enabled,
            ...(providerConfig.fetchOnClient !== undefined && {
              fetchOnClient: providerConfig.fetchOnClient,
            }),
          },
          provider,
        };
      }

      // Process extractEnabledModels and transformToAiModelList concurrently
      const [enabledModels, serverModelLists] = await Promise.all([
        extractEnabledModels(provider, modelString, providerConfig.withDeploymentName || false),
        transformToAiModelList({
          defaultModels: aiModels || [],
          modelString,
          providerId: provider,
          withDeploymentName: providerConfig.withDeploymentName || false,
        }),
      ]);

      return {
        config: {
          enabled,
          enabledModels,
          serverModelLists,
          ...(providerConfig.fetchOnClient !== undefined && {
            fetchOnClient: providerConfig.fetchOnClient,
          }),
        },
        provider,
      };
    }),
  );

  // Convert the results to an object
  const config = {} as Record<string, ProviderConfig>;
  for (const { provider, config: providerConfig } of providerConfigs) {
    config[provider] = providerConfig;
  }

  return config;
};
