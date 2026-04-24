import { Client, Receiver } from '@upstash/qstash';
import { Client as WorkflowClient } from '@upstash/workflow';
import debug from 'debug';

const log = debug('lobe-server:qstash');

const headers = {
  ...(process.env.VERCEL_AUTOMATION_BYPASS_SECRET && {
    'x-vercel-protection-bypass': process.env.VERCEL_AUTOMATION_BYPASS_SECRET,
  }),
};

const lazyClient = <T extends object>(factory: () => T): T => {
  let instance: T | undefined;
  return new Proxy({} as T, {
    get(_t, prop, receiver) {
      if (!instance) instance = factory();
      return Reflect.get(instance as object, prop, receiver);
    },
  });
};

/**
 * QStash client with Vercel Deployment Protection bypass headers.
 * Lazily instantiated on first access so missing QSTASH_TOKEN only throws/warns
 * when workflow endpoints are actually invoked.
 */
export const qstashClient = lazyClient(
  () =>
    new Client({
      headers,
      token: process.env.QSTASH_TOKEN!,
    }),
);

/**
 * Workflow client with Vercel Deployment Protection bypass headers.
 */
export const workflowClient = lazyClient(
  () =>
    new WorkflowClient({
      headers,
      token: process.env.QSTASH_TOKEN!,
    }),
);

/**
 * Verify QStash signature using Receiver.
 * Returns true if signing keys are not configured (verification skipped) or signature is valid.
 */
export async function verifyQStashSignature(request: Request, rawBody: string): Promise<boolean> {
  const currentSigningKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
  const nextSigningKey = process.env.QSTASH_NEXT_SIGNING_KEY;

  if (!currentSigningKey || !nextSigningKey) {
    log('QStash signature verification disabled (no signing keys configured)');
    return false;
  }

  const signature = request.headers.get('Upstash-Signature');
  if (!signature) {
    log('Missing Upstash-Signature header');
    return false;
  }

  const receiver = new Receiver({ currentSigningKey, nextSigningKey });

  try {
    return await receiver.verify({ body: rawBody, signature });
  } catch (error) {
    log('QStash signature verification failed: %O', error);
    return false;
  }
}
