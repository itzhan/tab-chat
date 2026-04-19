import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';

import { createNanoId } from '../utils/idGenerator';
import { timestamps, timestamptz } from './_helpers';
import { users } from './user';

export const subscriptionPlans = pgTable(
  'subscription_plans',
  {
    id: text('id').primaryKey().notNull(),
    name: text('name').notNull(),
    description: text('description'),
    storageQuotaBytes: bigint('storage_quota_bytes', { mode: 'number' }).notNull().default(0),
    isDefault: boolean('is_default').notNull().default(false),
    enabled: boolean('enabled').notNull().default(true),
    sortOrder: integer('sort_order').notNull().default(0),

    ...timestamps,
  },
  (t) => [index('subscription_plans_default_idx').on(t.isDefault)],
);

export const planModelQuotas = pgTable(
  'plan_model_quotas',
  {
    id: serial('id').primaryKey().notNull(),
    planId: text('plan_id')
      .references(() => subscriptionPlans.id, { onDelete: 'cascade' })
      .notNull(),
    providerId: text('provider_id').notNull(),
    modelId: text('model_id').notNull(),
    monthlyLimit: integer('monthly_limit').notNull().default(0),

    ...timestamps,
  },
  (t) => [
    uniqueIndex('plan_model_quotas_uq').on(t.planId, t.providerId, t.modelId),
    index('plan_model_quotas_plan_idx').on(t.planId),
  ],
);

export const userSubscriptions = pgTable(
  'user_subscriptions',
  {
    id: text('id')
      .$defaultFn(() => createNanoId(16)())
      .primaryKey()
      .notNull(),
    userId: text('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    planId: text('plan_id')
      .references(() => subscriptionPlans.id)
      .notNull(),
    startAt: timestamptz('start_at').notNull().defaultNow(),
    expireAt: timestamptz('expire_at'),
    status: text('status').notNull().default('active'),

    ...timestamps,
  },
  (t) => [
    index('user_subscriptions_user_idx').on(t.userId),
    index('user_subscriptions_status_idx').on(t.status),
  ],
);

export const usageRecords = pgTable(
  'usage_records',
  {
    id: serial('id').primaryKey().notNull(),
    userId: text('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    providerId: text('provider_id').notNull(),
    modelId: text('model_id').notNull(),
    periodMonth: text('period_month').notNull(),
    messageCount: integer('message_count').notNull().default(0),

    ...timestamps,
  },
  (t) => [
    uniqueIndex('usage_records_uq').on(t.userId, t.providerId, t.modelId, t.periodMonth),
    index('usage_records_user_idx').on(t.userId),
  ],
);

export const boostPacks = pgTable(
  'boost_packs',
  {
    id: text('id')
      .$defaultFn(() => createNanoId(16)())
      .primaryKey()
      .notNull(),
    userId: text('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    providerId: text('provider_id').notNull(),
    modelId: text('model_id').notNull(),
    /**
     * When set, this row covers a group of models that share `remainingCount`.
     * Each item: { providerId, modelId }. Legacy rows leave this NULL and rely on
     * the single (providerId, modelId) pair above.
     */
    modelIds: jsonb('model_ids').$type<Array<{ providerId: string; modelId: string }>>(),
    /** Optional reference to the template that produced this grant, for audit. */
    templateId: text('template_id'),
    /** Human-readable label shown to the user, e.g. "GPT-5 系列 100 次". */
    label: text('label'),
    remainingCount: integer('remaining_count').notNull(),
    grantedBy: text('granted_by'),
    grantedReason: text('granted_reason'),
    expireAt: timestamptz('expire_at'),

    ...timestamps,
  },
  (t) => [index('boost_packs_user_model_idx').on(t.userId, t.providerId, t.modelId)],
);

export const insertSubscriptionPlanSchema = createInsertSchema(subscriptionPlans);
export const insertPlanModelQuotaSchema = createInsertSchema(planModelQuotas);
export const insertUserSubscriptionSchema = createInsertSchema(userSubscriptions);
export const insertUsageRecordSchema = createInsertSchema(usageRecords);
export const insertBoostPackSchema = createInsertSchema(boostPacks);

export type SubscriptionPlanItem = typeof subscriptionPlans.$inferSelect;
export type NewSubscriptionPlanItem = typeof subscriptionPlans.$inferInsert;

export type PlanModelQuotaItem = typeof planModelQuotas.$inferSelect;
export type NewPlanModelQuotaItem = typeof planModelQuotas.$inferInsert;

export type UserSubscriptionItem = typeof userSubscriptions.$inferSelect;
export type NewUserSubscriptionItem = typeof userSubscriptions.$inferInsert;

export type UsageRecordItem = typeof usageRecords.$inferSelect;
export type NewUsageRecordItem = typeof usageRecords.$inferInsert;

export type BoostPackItem = typeof boostPacks.$inferSelect;
export type NewBoostPackItem = typeof boostPacks.$inferInsert;

export type SubscriptionStatus = 'active' | 'expired' | 'cancelled';
