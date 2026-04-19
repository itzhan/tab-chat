import { jsonb, pgTable, text } from 'drizzle-orm/pg-core';

import { timestamps } from './_helpers';

/**
 * Global singleton key/value settings managed by site admins.
 * Current keys:
 *   - 'sidebar_allowlist': string[] of sidebar item ids visible to non-admin users.
 */
export const appSettings = pgTable('app_settings', {
  key: text('key').primaryKey().notNull(),
  value: jsonb('value').notNull(),
  ...timestamps,
});

export type AppSettingsItem = typeof appSettings.$inferSelect;
export type NewAppSettingsItem = typeof appSettings.$inferInsert;
