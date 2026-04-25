import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const getServerDBConfig = () => {
  return createEnv({
    runtimeEnv: {
      DATABASE_DRIVER: process.env.DATABASE_DRIVER || 'neon',
      DATABASE_POOL_MAX: process.env.DATABASE_POOL_MAX
        ? Number.parseInt(process.env.DATABASE_POOL_MAX, 10)
        : undefined,
      DATABASE_TEST_URL: process.env.DATABASE_TEST_URL,
      DATABASE_URL: process.env.DATABASE_URL,

      KEY_VAULTS_SECRET: process.env.KEY_VAULTS_SECRET,

      REMOVE_GLOBAL_FILE: process.env.DISABLE_REMOVE_GLOBAL_FILE !== '0',
    },
    server: {
      DATABASE_DRIVER: z.enum(['neon', 'node']),
      // Postgres connection pool size for `pg` driver. The pg default of 10 is
      // far too low for a multi-user self-hosted deployment — every concurrent
      // request needs at least one connection, and image-gen / async tasks
      // hold one for minutes. Bump to a generous default; override via env if
      // your DB has a tighter cap.
      DATABASE_POOL_MAX: z.coerce.number().int().positive().default(400),
      DATABASE_TEST_URL: z.string().optional(),
      DATABASE_URL: z.string().optional(),

      KEY_VAULTS_SECRET: z.string().optional(),

      REMOVE_GLOBAL_FILE: z.boolean().optional(),
    },
  });
};

export const serverDBEnv = getServerDBConfig();
