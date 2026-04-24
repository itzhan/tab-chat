import debug from 'debug';

import { FileModel } from '@/database/models/file';
import { getServerDB } from '@/database/server';
import { getRedisConfig } from '@/envs/redis';
import { initializeRedis, isRedisEnabled } from '@/libs/redis';
import { FileService } from '@/server/services/file';

const log = debug('lobe-file:proxy');

type Params = Promise<{ id: string }>;

const FILE_PROXY_KEY_PREFIX = 'file-proxy:';
// Cache presigned URL for 4 minutes (URL expires in 5 minutes)
const PRESIGNED_URL_CACHE_TTL = 240;
// Hard cap on any Redis op so an unreachable / misconfigured Redis never
// stalls image previews — ioredis otherwise retries forever by default.
const REDIS_OP_TIMEOUT_MS = 1500;

const buildCacheKey = (id: string) => `${FILE_PROXY_KEY_PREFIX}${id}`;

const withTimeout = <T>(p: Promise<T>, ms: number, label: string): Promise<T | null> =>
  Promise.race<T | null>([
    p,
    new Promise<null>((resolve) =>
      setTimeout(() => {
        log('Redis %s timeout after %dms, skipping cache', label, ms);
        resolve(null);
      }, ms),
    ),
  ]).catch((err) => {
    log('Redis %s error: %s, skipping cache', label, (err as Error).message);
    return null;
  });

interface CachedFileData {
  redirectUrl: string;
}

/**
 * File proxy service
 * GET /f/:id
 *
 * Features:
 * - Query database to get file record (without userId filter for public access)
 * - Generate access URL based on platform (desktop → local file, web → S3 presigned URL)
 * - Cache presigned URL in Redis to reduce S3 API calls
 * - Return 302 redirect
 */
export const GET = async (_req: Request, segmentData: { params: Params }) => {
  try {
    const params = await segmentData.params;
    const { id } = params;

    log('File proxy request: %s', id);

    // Try to get cached presigned URL from Redis. Any stall here — unreachable
    // Redis, auth hang, slow DNS — must not block the image preview.
    const redisConfig = getRedisConfig();
    const redisClient = isRedisEnabled(redisConfig)
      ? await withTimeout(initializeRedis(redisConfig), REDIS_OP_TIMEOUT_MS, 'init')
      : null;

    const cacheKey = buildCacheKey(id);
    if (redisClient) {
      const cachedStr = await withTimeout(redisClient.get(cacheKey), REDIS_OP_TIMEOUT_MS, 'get');
      const cached = cachedStr ? (JSON.parse(cachedStr) as CachedFileData) : null;
      if (cached?.redirectUrl) {
        log('Cache hit for file: %s', id);
        return Response.redirect(cached.redirectUrl, 302);
      }
      log('Cache miss for file: %s', id);
    }

    // Get database connection
    const db = await getServerDB();

    // Query file record without userId filter (public access)
    const file = await FileModel.getFileById(db, id);

    if (!file) {
      log('File not found: %s', id);
      return new Response('File not found', {
        status: 404,
      });
    }

    // Create file service with file owner's userId
    const fileService = new FileService(db, file.userId);

    // Web: Generate S3 presigned URL (5 minutes expiry)
    const redirectUrl = await fileService.createPreSignedUrlForPreview(file.url, 300);
    log('Web S3 presigned URL generated (expires in 5 min)');

    // Best-effort cache write. Failure/slowness here must not delay the redirect.
    if (redisClient) {
      await withTimeout(
        redisClient.set(cacheKey, JSON.stringify({ redirectUrl }), {
          ex: PRESIGNED_URL_CACHE_TTL,
        }),
        REDIS_OP_TIMEOUT_MS,
        'set',
      );
      log('Cached presigned URL for file: %s (TTL: %ds)', id, PRESIGNED_URL_CACHE_TTL);
    }

    // Return 302 redirect
    return Response.redirect(redirectUrl, 302);
  } catch (error) {
    console.error('File proxy error:', error);
    return new Response('Internal server error', {
      status: 500,
    });
  }
};
