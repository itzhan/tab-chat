import { users } from '@lobechat/database/schemas';
import { asc, eq } from 'drizzle-orm';

import type { LobeChatDatabase } from '@/database/type';

let cachedAdminId: string | null = null;
let cachedAt = 0;
const TTL_MS = 60_000;

/**
 * Find the "primary" admin user ID — used as the shared owner of provider configuration
 * so that all users hit the same LLM keys/endpoints administered centrally.
 *
 * Strategy: pick the earliest-created user with role='admin'. If none exists, returns null
 * and the caller should fall back to environment variables / the caller's own config.
 *
 * Cached in memory for a minute to avoid hitting DB on every chat.
 */
export const getPrimaryAdminUserId = async (db: LobeChatDatabase): Promise<string | null> => {
  const now = Date.now();
  if (cachedAdminId && now - cachedAt < TTL_MS) {
    return cachedAdminId;
  }

  const [row] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.role, 'admin'))
    .orderBy(asc(users.createdAt))
    .limit(1);

  cachedAdminId = row?.id ?? null;
  cachedAt = now;
  return cachedAdminId;
};

export const invalidatePrimaryAdminCache = () => {
  cachedAdminId = null;
  cachedAt = 0;
};
