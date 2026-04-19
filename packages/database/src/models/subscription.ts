import { and, asc, desc, eq, gt, isNull, or, sql } from 'drizzle-orm';

import type {
  BoostPackItem,
  NewBoostPackItem,
  NewPlanModelQuotaItem,
  NewSubscriptionPlanItem,
  NewUserSubscriptionItem,
  PlanModelQuotaItem,
  SubscriptionPlanItem,
  UserSubscriptionItem,
} from '../schemas';
import {
  boostPacks,
  planModelQuotas,
  subscriptionPlans,
  usageRecords,
  users,
  userSubscriptions,
} from '../schemas';
import type { LobeChatDatabase } from '../type';

const periodMonthOf = (date = new Date()) => {
  const y = date.getUTCFullYear();
  const m = `${date.getUTCMonth() + 1}`.padStart(2, '0');
  return `${y}-${m}`;
};

export class SubscriptionPlanModel {
  constructor(private db: LobeChatDatabase) {}

  list = async () =>
    this.db
      .select()
      .from(subscriptionPlans)
      .orderBy(asc(subscriptionPlans.sortOrder), asc(subscriptionPlans.createdAt));

  getById = async (id: string): Promise<SubscriptionPlanItem | undefined> =>
    this.db.query.subscriptionPlans.findFirst({ where: eq(subscriptionPlans.id, id) });

  getDefault = async (): Promise<SubscriptionPlanItem | undefined> =>
    this.db.query.subscriptionPlans.findFirst({
      where: and(eq(subscriptionPlans.isDefault, true), eq(subscriptionPlans.enabled, true)),
    });

  create = async (params: NewSubscriptionPlanItem) => {
    const [row] = await this.db.insert(subscriptionPlans).values(params).returning();
    return row;
  };

  update = async (id: string, params: Partial<NewSubscriptionPlanItem>) => {
    const [row] = await this.db
      .update(subscriptionPlans)
      .set(params)
      .where(eq(subscriptionPlans.id, id))
      .returning();
    return row;
  };

  delete = async (id: string) =>
    this.db.delete(subscriptionPlans).where(eq(subscriptionPlans.id, id));

  listModelQuotas = async (planId: string): Promise<PlanModelQuotaItem[]> =>
    this.db
      .select()
      .from(planModelQuotas)
      .where(eq(planModelQuotas.planId, planId))
      .orderBy(asc(planModelQuotas.providerId), asc(planModelQuotas.modelId));

  getModelQuota = async (
    planId: string,
    providerId: string,
    modelId: string,
  ): Promise<PlanModelQuotaItem | undefined> =>
    this.db.query.planModelQuotas.findFirst({
      where: and(
        eq(planModelQuotas.planId, planId),
        eq(planModelQuotas.providerId, providerId),
        eq(planModelQuotas.modelId, modelId),
      ),
    });

  upsertModelQuota = async (params: NewPlanModelQuotaItem) => {
    const [row] = await this.db
      .insert(planModelQuotas)
      .values(params)
      .onConflictDoUpdate({
        target: [planModelQuotas.planId, planModelQuotas.providerId, planModelQuotas.modelId],
        set: { monthlyLimit: params.monthlyLimit },
      })
      .returning();
    return row;
  };

  deleteModelQuota = async (planId: string, providerId: string, modelId: string) =>
    this.db
      .delete(planModelQuotas)
      .where(
        and(
          eq(planModelQuotas.planId, planId),
          eq(planModelQuotas.providerId, providerId),
          eq(planModelQuotas.modelId, modelId),
        ),
      );
}

export class UserSubscriptionModel {
  constructor(private db: LobeChatDatabase) {}

  getActiveByUser = async (userId: string): Promise<UserSubscriptionItem | undefined> => {
    const now = new Date();
    return this.db.query.userSubscriptions.findFirst({
      orderBy: desc(userSubscriptions.startAt),
      where: and(
        eq(userSubscriptions.userId, userId),
        eq(userSubscriptions.status, 'active'),
        or(isNull(userSubscriptions.expireAt), gt(userSubscriptions.expireAt, now)),
      ),
    });
  };

  ensureDefault = async (userId: string): Promise<UserSubscriptionItem | undefined> => {
    const existing = await this.getActiveByUser(userId);
    if (existing) return existing;

    const defaultPlan = await this.db.query.subscriptionPlans.findFirst({
      where: and(eq(subscriptionPlans.isDefault, true), eq(subscriptionPlans.enabled, true)),
    });
    if (!defaultPlan) return undefined;

    const [row] = await this.db
      .insert(userSubscriptions)
      .values({
        planId: defaultPlan.id,
        startAt: new Date(),
        status: 'active',
        userId,
      })
      .returning();
    return row;
  };

  upsert = async (params: NewUserSubscriptionItem) => {
    // 关闭所有当前激活的订阅，再插入新的
    await this.db
      .update(userSubscriptions)
      .set({ status: 'cancelled' })
      .where(
        and(eq(userSubscriptions.userId, params.userId), eq(userSubscriptions.status, 'active')),
      );

    const [row] = await this.db
      .insert(userSubscriptions)
      .values({ ...params, status: 'active' })
      .returning();
    return row;
  };

  listAllWithUsers = async (limit = 100) => {
    return this.db
      .select({
        banned: users.banned,
        email: users.email,
        expireAt: userSubscriptions.expireAt,
        planId: userSubscriptions.planId,
        role: users.role,
        startAt: userSubscriptions.startAt,
        status: userSubscriptions.status,
        subscriptionId: userSubscriptions.id,
        userId: users.id,
        username: users.username,
      })
      .from(users)
      .leftJoin(
        userSubscriptions,
        and(eq(userSubscriptions.userId, users.id), eq(userSubscriptions.status, 'active')),
      )
      .orderBy(desc(users.createdAt))
      .limit(limit);
  };
}

export class UsageRecordModel {
  constructor(private db: LobeChatDatabase) {}

  getCurrentMonthCount = async (
    userId: string,
    providerId: string,
    modelId: string,
  ): Promise<number> => {
    const row = await this.db.query.usageRecords.findFirst({
      where: and(
        eq(usageRecords.userId, userId),
        eq(usageRecords.providerId, providerId),
        eq(usageRecords.modelId, modelId),
        eq(usageRecords.periodMonth, periodMonthOf()),
      ),
    });
    return row?.messageCount ?? 0;
  };

  increment = async (userId: string, providerId: string, modelId: string) => {
    const periodMonth = periodMonthOf();
    await this.db
      .insert(usageRecords)
      .values({ messageCount: 1, modelId, periodMonth, providerId, userId })
      .onConflictDoUpdate({
        target: [
          usageRecords.userId,
          usageRecords.providerId,
          usageRecords.modelId,
          usageRecords.periodMonth,
        ],
        set: { messageCount: sql`${usageRecords.messageCount} + 1` },
      });
  };

  listUserMonth = async (userId: string, period = periodMonthOf()) =>
    this.db
      .select()
      .from(usageRecords)
      .where(and(eq(usageRecords.userId, userId), eq(usageRecords.periodMonth, period)));

  getTotalMessagesThisMonth = async (userId: string) => {
    const rows = await this.listUserMonth(userId);
    return rows.reduce((acc, r) => acc + r.messageCount, 0);
  };
}

export class BoostPackModel {
  constructor(private db: LobeChatDatabase) {}

  listByUser = async (userId: string): Promise<BoostPackItem[]> =>
    this.db
      .select()
      .from(boostPacks)
      .where(eq(boostPacks.userId, userId))
      .orderBy(desc(boostPacks.createdAt));

  /**
   * Returns all active boost packs covering the given (providerId, modelId).
   * Matches either (a) legacy single-model rows or (b) multi-model rows whose
   * `modelIds` JSONB array contains the pair.
   *
   * Sort order: expire-soonest first (use-it-or-lose-it), then smallest remaining
   * (drain small packs before big ones), then oldest — so consumption is deterministic.
   */
  listActive = async (
    userId: string,
    providerId: string,
    modelId: string,
  ): Promise<BoostPackItem[]> => {
    const now = new Date();
    // JSONB containment check expressed as raw SQL — drizzle doesn't wrap `@>` ergonomically.
    const modelIdsContains = sql`${boostPacks.modelIds} @> ${JSON.stringify([
      { providerId, modelId },
    ])}::jsonb`;

    return this.db
      .select()
      .from(boostPacks)
      .where(
        and(
          eq(boostPacks.userId, userId),
          or(
            and(eq(boostPacks.providerId, providerId), eq(boostPacks.modelId, modelId)),
            modelIdsContains,
          ),
          gt(boostPacks.remainingCount, 0),
          or(isNull(boostPacks.expireAt), gt(boostPacks.expireAt, now)),
        ),
      )
      .orderBy(
        // Postgres sorts NULLs first by default on ASC; we want expiring rows before never-expire
        sql`${boostPacks.expireAt} ASC NULLS LAST`,
        asc(boostPacks.remainingCount),
        asc(boostPacks.createdAt),
      );
  };

  grant = async (params: NewBoostPackItem) => {
    const [row] = await this.db.insert(boostPacks).values(params).returning();
    return row;
  };

  consumeOne = async (userId: string, providerId: string, modelId: string): Promise<boolean> => {
    const [active] = await this.listActive(userId, providerId, modelId);
    if (!active) return false;

    await this.db
      .update(boostPacks)
      .set({ remainingCount: sql`${boostPacks.remainingCount} - 1` })
      .where(eq(boostPacks.id, active.id));
    return true;
  };

  revoke = async (id: string) => this.db.delete(boostPacks).where(eq(boostPacks.id, id));

  listAll = async (limit = 100) =>
    this.db
      .select({
        boostPackId: boostPacks.id,
        createdAt: boostPacks.createdAt,
        email: users.email,
        expireAt: boostPacks.expireAt,
        label: boostPacks.label,
        modelId: boostPacks.modelId,
        modelIds: boostPacks.modelIds,
        providerId: boostPacks.providerId,
        remainingCount: boostPacks.remainingCount,
        templateId: boostPacks.templateId,
        userId: users.id,
        username: users.username,
      })
      .from(boostPacks)
      .leftJoin(users, eq(users.id, boostPacks.userId))
      .orderBy(desc(boostPacks.createdAt))
      .limit(limit);
}
