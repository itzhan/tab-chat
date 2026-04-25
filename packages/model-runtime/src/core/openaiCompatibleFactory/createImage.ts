import { imageUrlToBase64 } from '@lobechat/utils';
import { cleanObject } from '@lobechat/utils/object';
import createDebug from 'debug';
import type { RuntimeImageGenParamsValue } from 'model-bank';
import type OpenAI from 'openai';

import type { CreateImagePayload, CreateImageResponse } from '../../types/image';
import { getModelPricing } from '../../utils/getModelPricing';
import { parseDataUri } from '../../utils/uriParser';
import { convertImageUrlToFile } from '../contextBuilders/openai';
import { convertOpenAIImageUsage } from '../usageConverters/openai';

const log = createDebug('lobe-image:openai-compatible');

/**
 * Generate images using traditional OpenAI images API (DALL-E, etc.)
 */
async function generateByImageMode(
  client: OpenAI,
  payload: CreateImagePayload,
  provider: string,
): Promise<CreateImageResponse> {
  const { model, params, paramlessImageMode } = payload;

  log('Creating image with model: %s and params: %O', model, params);

  // Map parameter names, mapping imageUrls to image
  const paramsMap = new Map<RuntimeImageGenParamsValue, string>([
    ['imageUrls', 'image'],
    ['imageUrl', 'image'],
  ]);
  const userInput: Record<string, any> = Object.fromEntries(
    Object.entries(params).map(([key, value]) => [
      paramsMap.get(key as RuntimeImageGenParamsValue) ?? key,
      value,
    ]),
  );
  // unify image input to array
  if (typeof userInput.image === 'string' && userInput.image.trim() !== '') {
    userInput.image = [userInput.image];
  }

  // https://platform.openai.com/docs/api-reference/images/createEdit
  const isImageEdit = Array.isArray(userInput.image) && userInput.image.length > 0;
  log('isImageEdit: %O, userInput.image: %O', isImageEdit, userInput.image);
  // If there are imageUrls parameters, convert them to File objects
  if (isImageEdit) {
    try {
      // Convert all image URLs to File objects
      const imageFiles = await Promise.all(
        userInput.image.map((url: string) => convertImageUrlToFile(url)),
      );

      // According to official docs, if there are multiple images, pass an array; if only one, pass a single File
      userInput.image = imageFiles.length === 1 ? imageFiles[0] : imageFiles;
    } catch (error) {
      throw new Error(`Failed to convert image URLs to File objects: ${error}`, { cause: error });
    }
  } else {
    delete userInput.image;
  }

  if (userInput.size === 'auto') {
    delete userInput.size;
  }

  const defaultInput = {
    // Paramless gateways (sub2api gpt-image-2 etc.) reject or silently
    // ignore `n`; the user expresses count inside the prompt instead.
    ...(paramlessImageMode ? {} : { n: 1 }),
    ...(model.includes('dall-e') ? { response_format: 'b64_json' } : {}),
    // https://platform.openai.com/docs/api-reference/images/createEdit#images_createedit-input_fidelity
    ...(isImageEdit && model.includes('gpt-image-') && !model.includes('mini')
      ? { input_fidelity: 'high' }
      : {}),
  };

  const options = cleanObject({
    model,
    ...defaultInput,
    ...userInput,
  });

  log('options: %O', options);

  // Determine if it's an image editing operation
  const img = isImageEdit
    ? await client.images.edit(options as any)
    : await client.images.generate(options as any);

  // Check the integrity of response data
  if (!img || !img.data || !Array.isArray(img.data) || img.data.length === 0) {
    throw new Error('Invalid image response: missing or empty data array');
  }

  const decodeImageEntry = (entry: any): string | null => {
    if (!entry) return null;
    if (entry.b64_json) {
      // OpenAI image generation always defaults to PNG.
      return `data:image/png;base64,${entry.b64_json}`;
    }
    if (entry.url) return entry.url;
    return null;
  };

  // In paramless mode the upstream may return >1 image; otherwise behave
  // exactly as before (only data[0] is used).
  const decodedUrls = paramlessImageMode
    ? (img.data.map(decodeImageEntry).filter(Boolean) as string[])
    : (() => {
        const first = decodeImageEntry(img.data[0]);
        return first ? [first] : [];
      })();

  if (decodedUrls.length === 0) {
    throw new Error('Invalid image response: no decodable b64_json or url field');
  }

  const [imageUrl, ...extraImageUrls] = decodedUrls;
  log(
    'Decoded %d image(s) from upstream (paramless=%s)',
    decodedUrls.length,
    paramlessImageMode ?? false,
  );

  return {
    imageUrl,
    ...(extraImageUrls.length > 0 ? { extraImageUrls } : {}),
    ...(img.usage
      ? {
          modelUsage: convertOpenAIImageUsage(img.usage, await getModelPricing(model, provider)),
        }
      : {}),
  };
}

/**
 * Process image URL for chat model input
 */
async function processImageUrlForChat(imageUrl: string): Promise<string> {
  const { type, base64, mimeType } = parseDataUri(imageUrl);

  if (type === 'base64') {
    if (!base64) {
      throw new TypeError("Image URL doesn't contain base64 data");
    }
    return `data:${mimeType || 'image/png'};base64,${base64}`;
  } else if (type === 'url') {
    // For URL type, convert to base64 first
    const { base64: urlBase64, mimeType: urlMimeType } = await imageUrlToBase64(imageUrl);
    return `data:${urlMimeType};base64,${urlBase64}`;
  } else {
    throw new TypeError(`Currently we don't support image url: ${imageUrl}`);
  }
}

/**
 * Generate images using chat completion API (OpenRouter Gemini, etc.)
 */
async function generateByChatModel(
  client: OpenAI,
  payload: CreateImagePayload,
): Promise<CreateImageResponse> {
  const { model, params } = payload;
  const actualModel = model.replace(':image', ''); // Remove :image suffix

  log('Creating image via chat API with model: %s and params: %O', actualModel, params);

  // Build message content array
  const content: Array<any> = [
    {
      text: params.prompt,
      type: 'text',
    },
  ];

  // Add image for editing mode if provided
  if (params.imageUrl && params.imageUrl !== null) {
    log('Processing image URL for editing mode: %s', params.imageUrl);
    try {
      const processedImageUrl = await processImageUrlForChat(params.imageUrl);
      content.push({
        image_url: {
          url: processedImageUrl,
        },
        type: 'image_url',
      });
      log('Successfully processed image URL for chat input');
    } catch (error) {
      throw new Error(`Failed to process image URL: ${error}`, { cause: error });
    }
  }

  // Call chat completion API
  const response = await client.chat.completions.create({
    messages: [
      {
        content,
        role: 'user',
      },
    ],
    model: actualModel,
    stream: false,
  });

  log('Chat API response: %O', response);

  // Extract image from response
  const message = response.choices[0]?.message;
  if (!message) {
    throw new Error('No message in chat completion response');
  }

  const extractedUrl = extractImageUrlFromChatMessage(message);
  if (extractedUrl) {
    // Already a data URI — return as-is.
    if (extractedUrl.startsWith('data:')) return { imageUrl: extractedUrl };

    // Self-hosted OpenAI-compatible gateways often return an absolute proxy
    // URL built from the request's Host header. That host can be unreachable
    // from a later fetch() (Docker network mismatch, IPv6 routing, undici
    // keep-alive quirks). Inline the bytes here using the same transport
    // context, so downstream sees a data URI and never hits the network.
    try {
      const inlined = await fetchImageAsDataUri(client, extractedUrl);
      if (inlined) return { imageUrl: inlined };
    } catch (e) {
      log('inline fetch failed, returning raw url: %s', (e as Error).message);
    }
    return { imageUrl: extractedUrl };
  }

  log('could not parse image from chat message: %O', message);
  throw new Error('No image generated in chat completion response');
}

/**
 * Fetch an image URL and encode it as a base64 data URI.
 * Uses the OpenAI client's apiKey for auth, and rewrites the URL host to match
 * the client's baseURL when they share the same proxy path layout. This lets
 * us reach gateway-built image proxy URLs even when their hostname is only
 * valid in a different network (Docker service name, etc.).
 */
async function fetchImageAsDataUri(client: OpenAI, rawUrl: string): Promise<string | null> {
  const clientBase = (client as any).baseURL as string | undefined;

  const candidates = new Set<string>([rawUrl]);

  // Node's fetch resolves `localhost` to ::1 first on many systems; if a
  // hijacker (Docker/orbstack/proxy) answers on v6 but not v4, we get
  // "other side closed". Retrying with an explicit 127.0.0.1 bypasses this.
  try {
    const u = new URL(rawUrl);
    if (u.hostname === 'localhost') {
      const v4 = new URL(rawUrl);
      v4.hostname = '127.0.0.1';
      candidates.add(v4.toString());
    }
  } catch {
    /* ignore */
  }

  if (clientBase) {
    try {
      const clientBaseUrl = new URL(clientBase);
      const rawUrlObj = new URL(rawUrl);
      // Swap the host while keeping path+query — useful when gateway baked in
      // a Docker-network host that the lobehub process can't resolve.
      if (rawUrlObj.host !== clientBaseUrl.host) {
        const swapped = new URL(rawUrl);
        swapped.protocol = clientBaseUrl.protocol;
        swapped.host = clientBaseUrl.host;
        candidates.add(swapped.toString());
        if (swapped.hostname === 'localhost') {
          const v4 = new URL(swapped.toString());
          v4.hostname = '127.0.0.1';
          candidates.add(v4.toString());
        }
      }
    } catch {
      // ignore URL parse errors; we'll just try the raw url
    }
  }

  const apiKey = (client as any).apiKey as string | undefined;
  const headers: Record<string, string> = {};
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  let lastError: unknown;
  for (const candidate of candidates) {
    try {
      log('fetching inline image from: %s', candidate);
      const { buffer, contentType } = await fetchViaNodeHttp(candidate, headers);
      const mime = contentType || 'image/png';
      return `data:${mime};base64,${buffer.toString('base64')}`;
    } catch (err) {
      lastError = err;
    }
  }
  if (lastError) throw lastError;
  return null;
}

/**
 * Fetch using Node's raw http/https module, bypassing undici/global fetch.
 *
 * The built-in `fetch` (undici) frequently fails with "other side closed" when
 * talking to self-hosted proxies on `localhost`/`127.0.0.1` — likely due to
 * keep-alive pool reuse + HTTP/1.1 quirks + OrbStack/Docker port forwarders.
 * The raw http module works every time with the same URL.
 */
async function fetchViaNodeHttp(
  url: string,
  headers: Record<string, string>,
): Promise<{ buffer: Buffer; contentType: string }> {
  const { request: httpRequest } = await import('node:http');
  const { request: httpsRequest } = await import('node:https');

  const maxRedirects = 5;

  const doRequest = (
    target: string,
    remaining: number,
  ): Promise<{ buffer: Buffer; contentType: string }> =>
    new Promise((resolve, reject) => {
      const u = new URL(target);
      const requester = u.protocol === 'https:' ? httpsRequest : httpRequest;
      const req = requester(
        {
          method: 'GET',
          host: u.hostname,
          port: u.port || (u.protocol === 'https:' ? 443 : 80),
          path: u.pathname + u.search,
          headers: { Accept: '*/*', ...headers },
        },
        (res) => {
          // follow redirects
          if (
            res.statusCode &&
            res.statusCode >= 300 &&
            res.statusCode < 400 &&
            res.headers.location &&
            remaining > 0
          ) {
            res.resume();
            const next = new URL(res.headers.location, target).toString();
            doRequest(next, remaining - 1).then(resolve, reject);
            return;
          }
          if (!res.statusCode || res.statusCode >= 400) {
            res.resume();
            reject(new Error(`HTTP ${res.statusCode} ${res.statusMessage || ''}`));
            return;
          }
          const chunks: Buffer[] = [];
          res.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
          res.on('end', () =>
            resolve({
              buffer: Buffer.concat(chunks),
              contentType: (res.headers['content-type'] as string) || '',
            }),
          );
          res.on('error', reject);
        },
      );
      req.on('error', reject);
      req.setTimeout(60_000, () => {
        req.destroy(new Error('request timeout'));
      });
      req.end();
    });

  return doRequest(url, maxRedirects);
}

/**
 * Try to pull an image URL / data URL out of a chat completion message.
 * Supports several provider conventions so custom OpenAI-compatible gateways
 * (e.g. self-hosted ChatGPT proxies that stream image tasks through the chat
 * endpoint) work without patching per-provider code.
 */
function extractImageUrlFromChatMessage(message: any): string | null {
  // 1) OpenRouter / Gemini-style: message.images: [{ image_url: { url } }]
  if (Array.isArray(message?.images) && message.images.length > 0) {
    const first = message.images[0];
    const url = first?.image_url?.url || first?.url;
    if (typeof url === 'string' && url) return url;
  }

  // 2) content is an array of parts (OpenAI Vision-style)
  if (Array.isArray(message?.content)) {
    for (const part of message.content) {
      if (!part || typeof part !== 'object') continue;
      // { type: 'image_url', image_url: { url } }
      if (part.type === 'image_url') {
        const url = part.image_url?.url || part.image_url;
        if (typeof url === 'string' && url) return url;
      }
      // { type: 'image', source: { type: 'base64', media_type, data } } (Anthropic-ish)
      if (part.type === 'image' && part.source?.data) {
        const mime = part.source.media_type || 'image/png';
        return `data:${mime};base64,${part.source.data}`;
      }
      // { type: 'output_image', image_url } or similar
      if (typeof part.image_url === 'string' && part.image_url) return part.image_url;
    }
  }

  // 3) content is a string containing markdown image(s): ![alt](url) or bare URL
  if (typeof message?.content === 'string' && message.content.length > 0) {
    const mdMatch = message.content.match(/!\[[^\]]*\]\(([^)\s]+)/);
    if (mdMatch?.[1]) return mdMatch[1];
    const urlMatch = message.content.match(/https?:\/\/\S+\.(?:png|jpe?g|webp|gif)(?:\?\S*)?/i);
    if (urlMatch?.[0]) return urlMatch[0];
    const dataMatch = message.content.match(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/);
    if (dataMatch?.[0]) return dataMatch[0];
  }

  // 4) Non-standard top-level fields some proxies use
  if (typeof message?.image_url === 'string' && message.image_url) return message.image_url;
  if (typeof message?.image === 'string' && message.image) return message.image;

  return null;
}

/**
 * Create image using OpenAI Compatible API
 */
export async function createOpenAICompatibleImage(
  client: OpenAI,
  payload: CreateImagePayload,
  provider: string,
): Promise<CreateImageResponse> {
  const { model } = payload;

  // Check if it's a chat model for image generation (via :image suffix)
  if (model.endsWith(':image')) {
    return await generateByChatModel(client, payload);
  }

  // Default to traditional images API
  return await generateByImageMode(client, payload, provider);
}
