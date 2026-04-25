import type { AiFullModelCard, LobeDefaultAiModelListItem } from 'model-bank';

// One-shot index over LOBE_DEFAULT_MODEL_LIST. Building this once turns each
// lookup from O(N) (Array.find scans 1000+ entries) into O(1). The previous
// implementation called `Array.find` *twice* per model property and was called
// twice (description + pricing) per enabled model on every page mount, so a
// 100-model account paid ~400 linear scans on the boot critical path.
let modelByIdIndex: Map<string, LobeDefaultAiModelListItem> | null = null;
let modelByProviderAndIdIndex: Map<string, LobeDefaultAiModelListItem> | null = null;
let modelListLoader: Promise<LobeDefaultAiModelListItem[]> | null = null;

const ensureIndex = async (): Promise<void> => {
  if (modelByIdIndex && modelByProviderAndIdIndex) return;

  if (!modelListLoader) {
    modelListLoader = import('model-bank').then((mod) => mod.LOBE_DEFAULT_MODEL_LIST);
  }
  const list = await modelListLoader;

  const byId = new Map<string, LobeDefaultAiModelListItem>();
  const byProviderAndId = new Map<string, LobeDefaultAiModelListItem>();

  for (const model of list) {
    if (model.providerId) {
      byProviderAndId.set(`${model.providerId}::${model.id}`, model);
    }
    // First-write-wins for id-only fallback so we keep deterministic resolution.
    if (!byId.has(model.id)) byId.set(model.id, model);
  }

  modelByIdIndex = byId;
  modelByProviderAndIdIndex = byProviderAndId;
};

/**
 * Get the model property value, first from the specified provider, and then from other providers as a fallback.
 * @param modelId The ID of the model.
 * @param propertyName The name of the property.
 * @param providerId Optional provider ID for an exact match.
 * @returns The property value or a default value.
 */
export const getModelPropertyWithFallback = async <T>(
  modelId: string,
  propertyName: keyof AiFullModelCard,
  providerId?: string,
): Promise<T> => {
  await ensureIndex();

  if (providerId) {
    const exactMatch = modelByProviderAndIdIndex!.get(`${providerId}::${modelId}`);
    if (exactMatch && exactMatch[propertyName] !== undefined) {
      return exactMatch[propertyName] as T;
    }
  }

  const fallbackMatch = modelByIdIndex!.get(modelId);
  if (fallbackMatch && fallbackMatch[propertyName] !== undefined) {
    return fallbackMatch[propertyName] as T;
  }

  return (propertyName === 'type' ? 'chat' : undefined) as T;
};
