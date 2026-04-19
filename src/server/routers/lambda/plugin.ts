import { type LobeTool } from '@lobechat/types';
import { z } from 'zod';

import { AppSettingsModel } from '@/database/models/appSettings';
import { PluginModel } from '@/database/models/plugin';
import { getServerDB } from '@/database/server';
import { authedProcedure, publicProcedure, router } from '@/libs/trpc/lambda';
import { serverDatabase } from '@/libs/trpc/lambda/middleware';

const pluginProcedure = authedProcedure.use(serverDatabase).use(async (opts) => {
  const { ctx } = opts;

  return opts.next({
    ctx: { pluginModel: new PluginModel(ctx.serverDB, ctx.userId) },
  });
});

export const pluginRouter = router({
  createOrInstallPlugin: pluginProcedure
    .input(
      z.object({
        customParams: z.any(),
        identifier: z.string(),
        manifest: z.any(),
        settings: z.any(),
        type: z.enum(['plugin', 'customPlugin']),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const result = await ctx.pluginModel.findById(input.identifier);

      // if not exist, we should create the plugin
      if (!result) {
        const data = await ctx.pluginModel.create({
          customParams: input.customParams,
          identifier: input.identifier,
          manifest: input.manifest,
          settings: input.settings,
          type: input.type,
        });

        return data.identifier;
      }

      // or we can just update the plugin manifest
      await ctx.pluginModel.update(input.identifier, { manifest: input.manifest });
    }),

  createPlugin: pluginProcedure
    .input(
      z.object({
        customParams: z.any(),
        identifier: z.string(),
        manifest: z.any(),
        type: z.enum(['plugin', 'customPlugin']),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const data = await ctx.pluginModel.create({
        customParams: input.customParams,
        identifier: input.identifier,
        manifest: input.manifest,
        type: input.type,
      });

      return data.identifier;
    }),

  // TODO: In the future, this method also needs to use authedProcedure
  getPlugins: publicProcedure.query(async ({ ctx }): Promise<LobeTool[]> => {
    if (!ctx.userId) return [];

    const serverDB = await getServerDB();
    const pluginModel = new PluginModel(serverDB, ctx.userId);

    const [userPlugins, globalEntries] = await Promise.all([
      pluginModel.query(),
      new AppSettingsModel(serverDB).getGlobalPluginList(),
    ]);

    // Merge admin-curated global plugins — user sees them alongside their own, with
    // admin-overridden title/description applied. Identifier collisions prefer user entry.
    const existingIds = new Set(userPlugins.map((p) => p.identifier));
    const synthetic: LobeTool[] = globalEntries
      .filter((g) => !existingIds.has(g.identifier))
      .map(
        (g) =>
          ({
            author: 'admin',
            createdAt: '',
            customParams: {},
            description: g.displayDescription ?? g.manifest?.meta?.description ?? '',
            homepage: '',
            identifier: g.identifier,
            manifest: g.manifest ?? { identifier: g.identifier, type: g.type },
            settings: {},
            title: g.displayTitle ?? g.manifest?.meta?.title ?? g.identifier,
            type: g.type === 'mcp' ? 'plugin' : 'plugin',
            updatedAt: '',
          }) as any,
      );

    return [...userPlugins, ...synthetic];
  }),

  removeAllPlugins: pluginProcedure.mutation(async ({ ctx }) => {
    return ctx.pluginModel.deleteAll();
  }),

  removePlugin: pluginProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      return ctx.pluginModel.delete(input.id);
    }),

  updatePlugin: pluginProcedure
    .input(
      z.object({
        customParams: z.any().optional(),
        id: z.string(),
        manifest: z.any().optional(),
        settings: z.any().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      return ctx.pluginModel.update(input.id, {
        customParams: input.customParams,
        manifest: input.manifest,
        settings: input.settings,
      });
    }),
});

export type PluginRouter = typeof pluginRouter;
