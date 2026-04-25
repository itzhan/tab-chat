import type { ModelUsage } from '@lobechat/types';
import type { RuntimeImageGenParams } from 'model-bank';

export type CreateImagePayload = {
  model: string;
  /**
   * When true, the OpenAI-compatible adapter:
   *   1. omits `n` from the upstream request (some gateways like sub2api
   *      reject or silently drop it)
   *   2. surfaces every entry of the response `data[]` instead of taking
   *      only data[0]
   * Driven by AiProviderSettings.paramlessImageMode at the lambda layer.
   */
  paramlessImageMode?: boolean;
  params: RuntimeImageGenParams;
};

/**
 * Why return width and height?
 * 1. The configured width may differ from the actual generated width, which needs to be stored in the generation asset
 * 2. Image dimensions are needed to determine if thumbnail generation is required. Most providers return dimensions, potentially saving computation
 */
export type CreateImageResponse = {
  /**
   * Additional images beyond `imageUrl`, populated when the upstream
   * returned a `data[]` array with more than one entry AND the caller asked
   * for paramless mode. The lambda layer fans these out into extra
   * generation rows so each image gets its own asset / preview.
   * Stays empty/undefined for normal single-image flows so existing
   * callers (Banana etc.) are unaffected.
   */
  extraImageUrls?: string[];

  /**
   * Image height
   */
  height?: number;

  /**
   * Usually the provider's CDN URL, which often expires after some time and needs to be re-requested
   */
  imageUrl: string;

  /**
   * For models like GPT-image, Nano Banana which are LLMs with image output modality
   */
  modelUsage?: ModelUsage;

  /**
   * Image width
   */
  width?: number;
};

// New: Runtime interface for authenticated image download support
export interface AuthenticatedImageRuntime {
  /**
   * Get authentication headers for image download
   * Used when the image server requires authentication
   */
  getAuthHeaders: () => Record<string, string> | undefined;
}
