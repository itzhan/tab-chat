import { z } from 'zod';

import { AppSettingsModel } from '@/database/models/appSettings';
import { adminProcedure, authedProcedure, router } from '@/libs/trpc/lambda';
import { serverDatabase } from '@/libs/trpc/lambda/middleware';

const userProc = authedProcedure.use(serverDatabase);

export const adminAppSettingsRouter = router({
  // Admin: read & write sidebar allowlist
  getSidebarAllowlist: adminProcedure.query(async ({ ctx }) => {
    return new AppSettingsModel(ctx.serverDB).getSidebarAllowlist();
  }),

  setSidebarAllowlist: adminProcedure
    .input(z.object({ items: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      await new AppSettingsModel(ctx.serverDB).setSidebarAllowlist(input.items);
      return { ok: true };
    }),

  // User-callable: what am I allowed to see?
  getMySidebarAllowlist: userProc.query(async ({ ctx }) => {
    return new AppSettingsModel(ctx.serverDB).getSidebarAllowlist();
  }),

  // Admin: toggle "users can run client-side fetch with admin key"
  getAllowUsersClientFetch: adminProcedure.query(async ({ ctx }) => {
    return new AppSettingsModel(ctx.serverDB).getAllowUsersClientFetch();
  }),

  setAllowUsersClientFetch: adminProcedure
    .input(z.object({ enabled: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      await new AppSettingsModel(ctx.serverDB).setAllowUsersClientFetch(input.enabled);
      return { ok: true };
    }),

  // Admin: builtin skill allowlist — which builtin skills are exposed to users
  getBuiltinSkillAllowlist: adminProcedure.query(async ({ ctx }) => {
    return new AppSettingsModel(ctx.serverDB).getBuiltinSkillAllowlist();
  }),

  setBuiltinSkillAllowlist: adminProcedure
    .input(z.object({ items: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      await new AppSettingsModel(ctx.serverDB).setBuiltinSkillAllowlist(input.items);
      return { ok: true };
    }),

  // User-callable: which builtin skills am I allowed to use?
  getMyBuiltinSkillAllowlist: userProc.query(async ({ ctx }) => {
    return new AppSettingsModel(ctx.serverDB).getBuiltinSkillAllowlist();
  }),

  // Admin: global plugin list (curated from market, exposed to all users)
  getGlobalPluginList: adminProcedure.query(async ({ ctx }) => {
    return new AppSettingsModel(ctx.serverDB).getGlobalPluginList();
  }),

  setGlobalPluginList: adminProcedure
    .input(
      z.object({
        items: z.array(
          z.object({
            identifier: z.string(),
            type: z.enum(['mcp', 'skill']),
            displayTitle: z.string().optional(),
            displayDescription: z.string().optional(),
            manifest: z.any().optional(),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await new AppSettingsModel(ctx.serverDB).setGlobalPluginList(input.items);
      return { ok: true };
    }),

  getMyGlobalPluginList: userProc.query(async ({ ctx }) => {
    return new AppSettingsModel(ctx.serverDB).getGlobalPluginList();
  }),

  // Admin: builtin skill title/description overrides
  getBuiltinSkillOverrides: adminProcedure.query(async ({ ctx }) => {
    return new AppSettingsModel(ctx.serverDB).getBuiltinSkillOverrides();
  }),

  setBuiltinSkillOverrides: adminProcedure
    .input(
      z.object({
        overrides: z.record(
          z.string(),
          z.object({ title: z.string().optional(), description: z.string().optional() }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await new AppSettingsModel(ctx.serverDB).setBuiltinSkillOverrides(input.overrides);
      return { ok: true };
    }),

  getMyBuiltinSkillOverrides: userProc.query(async ({ ctx }) => {
    return new AppSettingsModel(ctx.serverDB).getBuiltinSkillOverrides();
  }),

  // Admin: boost pack templates (purchasable catalog)
  getBoostPackTemplates: adminProcedure.query(async ({ ctx }) => {
    return new AppSettingsModel(ctx.serverDB).getBoostPackTemplates();
  }),

  setBoostPackTemplates: adminProcedure
    .input(
      z.object({
        items: z.array(
          z.object({
            id: z.string().min(1).max(64),
            name: z.string().min(1).max(128),
            description: z.string().optional(),
            enabled: z.boolean().default(true),
            sortOrder: z.number().int().default(0),
            models: z.array(z.object({ providerId: z.string(), modelId: z.string() })),
            quotaPerUnit: z.number().int().positive(),
            pricingTiers: z.array(
              z.object({
                quantity: z.number().int().positive(),
                price: z.number().nonnegative(),
                label: z.string().optional(),
              }),
            ),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await new AppSettingsModel(ctx.serverDB).setBoostPackTemplates(input.items);
      return { ok: true };
    }),

  // User-callable: what boost packs are available for purchase
  getMyBoostPackTemplates: userProc.query(async ({ ctx }) => {
    const all = await new AppSettingsModel(ctx.serverDB).getBoostPackTemplates();
    return all.filter((t) => t.enabled).sort((a, b) => a.sortOrder - b.sortOrder);
  }),
});
