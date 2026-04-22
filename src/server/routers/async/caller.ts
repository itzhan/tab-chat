import { createTRPCClient, httpLink } from '@trpc/client';
import superjson from 'superjson';
import urlJoin from 'url-join';

import { appEnv } from '@/envs/app';
import { LOBE_CHAT_AUTH_HEADER } from '@/envs/auth';
import { createAsyncCallerFactory } from '@/libs/trpc/async';
import { signInternalJWT } from '@/libs/trpc/utils/internalJwt';
import { KeyVaultsGateKeeper } from '@/server/modules/KeyVaultsEncrypt';

import { type AsyncRouter } from './index';
import { asyncRouter } from './index';

export const createAsyncServerClient = async (userId: string) => {
  const token = await signInternalJWT();
  const gateKeeper = await KeyVaultsGateKeeper.initWithEnvKey();
  const headers: Record<string, string> = {
    Authorization: token,
    [LOBE_CHAT_AUTH_HEADER]: await gateKeeper.encrypt(JSON.stringify({ userId })),
  };

  if (process.env.VERCEL_AUTOMATION_BYPASS_SECRET) {
    headers['x-vercel-protection-bypass'] = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  }

  const client = createTRPCClient<AsyncRouter>({
    links: [
      httpLink({
        headers,
        transformer: superjson,
        // Use INTERNAL_APP_URL for server-to-server calls to bypass CDN/proxy
        url: urlJoin(appEnv.INTERNAL_APP_URL!, '/trpc/async'),
      }),
    ],
  });

  return client;
};

/**
 * Helper method for inferring caller type, but does not actually call createAsyncCallerFactory. Calling it will throw an error: asyncRouter is not initialized
 */
const helperFunc = () => {
  const dummyCreateCaller = createAsyncCallerFactory(asyncRouter);
  return {} as unknown as ReturnType<typeof dummyCreateCaller>;
};

export type UnifiedAsyncCaller = ReturnType<typeof helperFunc>;

interface CreateCallerOptions {
  userId: string;
}

/**
 * Factory method for creating caller.
 *
 * Uses an **in-process tRPC caller** (no HTTP self-loop) so the async dispatch
 * does NOT depend on INTERNAL_APP_URL/APP_URL and cannot fail silently when the
 * Next.js server port differs from the env value. This fixes the symptom where
 * image.createImage creates the batch row but the async task never runs.
 *
 * Errors from procedure calls are logged with console.error (instead of the
 * previous fire-and-forget HTTP rejection that was swallowed).
 */
export const createAsyncCaller = async (
  options: CreateCallerOptions,
): Promise<UnifiedAsyncCaller> => {
  const { userId } = options;

  // Sign an internal JWT so asyncAuth middleware still validates the call.
  const authorizationToken = await signInternalJWT();

  const createCaller = createAsyncCallerFactory(asyncRouter);
  const inProcessCaller = createCaller({ authorizationToken, userId });

  // Wrap the caller so every procedure call gets an error logger attached.
  // This preserves existing call-sites (caller.image.createImage({...}))
  // while surfacing failures in the server console instead of eating them.
  const wrap = (target: any, path: string[]): any =>
    new Proxy(() => {}, {
      apply: (_t, _this, args) => {
        const procedure = path.reduce((obj, key) => (obj ? obj[key] : undefined), target);
        if (typeof procedure !== 'function') {
          throw new Error(`Async procedure not found at path: ${path.join('.')}`);
        }
        const result = procedure(...args);
        if (result && typeof (result as any).then === 'function') {
          (result as Promise<unknown>).catch((err) => {
            console.error(
              `[async-caller] ${path.join('.')} failed:`,
              err instanceof Error ? err.stack || err.message : err,
            );
          });
        }
        return result;
      },
      get: (_t, property: string) => {
        if (property === 'then') return undefined;
        return wrap(target, [...path, property]);
      },
    });

  return wrap(inProcessCaller, []) as unknown as UnifiedAsyncCaller;
};
