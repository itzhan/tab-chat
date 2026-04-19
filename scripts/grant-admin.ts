/**
 * Promote a user to admin role. Usage:
 *   docker compose exec lobehub bun run scripts/grant-admin.ts --email=you@example.com
 *   docker compose exec lobehub bun run scripts/grant-admin.ts --userId=<id>
 */
import * as dotenv from 'dotenv';
import dotenvExpand from 'dotenv-expand';

dotenvExpand.expand(dotenv.config());

const parseArg = (name: string): string | undefined => {
  const prefix = `--${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : undefined;
};

const run = async () => {
  const email = parseArg('email');
  const userId = parseArg('userId');

  if (!email && !userId) {
    console.error('Usage: grant-admin --email=<email> | --userId=<id>');
    process.exit(1);
  }

  const { serverDB } = await import('../packages/database/src/server');
  const { users } = await import('../packages/database/src/schemas');
  const { eq } = await import('drizzle-orm');

  const db = serverDB;

  const where = email ? eq(users.email, email) : eq(users.id, userId!);
  const [target] = await db.select().from(users).where(where).limit(1);

  if (!target) {
    console.error(`❌ user not found (email=${email ?? ''}, id=${userId ?? ''})`);
    process.exit(1);
  }

  await db.update(users).set({ role: 'admin' }).where(eq(users.id, target.id));

  console.log(`✅ granted admin to ${target.email ?? target.id}`);
  process.exit(0);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
