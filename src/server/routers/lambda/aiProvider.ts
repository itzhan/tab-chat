import { TRPCError } from '@trpc/server';
import { z } from 'zod';

import { AiProviderModel } from '@/database/models/aiProvider';
import { AppSettingsModel } from '@/database/models/appSettings';
import { UserModel } from '@/database/models/user';
import { AiInfraRepos } from '@/database/repositories/aiInfra';
import { authedProcedure, router } from '@/libs/trpc/lambda';
import { serverDatabase } from '@/libs/trpc/lambda/middleware';
import { getServerGlobalConfig } from '@/server/globalConfig';
import { getPrimaryAdminUserId } from '@/server/modules/Admin/getPrimaryAdminUserId';
import { KeyVaultsGateKeeper } from '@/server/modules/KeyVaultsEncrypt';
import { initModelRuntimeFromDB } from '@/server/modules/ModelRuntime';
import { type AiProviderDetailItem, type AiProviderRuntimeState } from '@/types/aiProvider';
import {
  CreateAiProviderSchema,
  UpdateAiProviderConfigSchema,
  UpdateAiProviderSchema,
} from '@/types/aiProvider';
import { type ProviderConfig } from '@/types/user/settings';

/**
 * For non-admin callers, substitute the config owner with the primary admin so that
 * queries return the shared provider configuration. Mutations below are guarded by
 * an explicit admin check — users cannot edit shared config.
 */
const resolveConfigOwnerId = async (
  db: Parameters<typeof getPrimaryAdminUserId>[0],
  callerUserId: string,
): Promise<{ ownerId: string; callerIsAdmin: boolean }> => {
  const callerUser = await UserModel.findById(db, callerUserId);
  const callerIsAdmin = callerUser?.role === 'admin';
  if (callerIsAdmin) return { callerIsAdmin, ownerId: callerUserId };
  const adminId = await getPrimaryAdminUserId(db);
  return { callerIsAdmin, ownerId: adminId ?? callerUserId };
};

const aiProviderProcedure = authedProcedure.use(serverDatabase).use(async (opts) => {
  const { ctx } = opts;

  const { aiProvider } = await getServerGlobalConfig();

  const { ownerId, callerIsAdmin } = await resolveConfigOwnerId(ctx.serverDB, ctx.userId);
  const gateKeeper = await KeyVaultsGateKeeper.initWithEnvKey();
  return opts.next({
    ctx: {
      aiInfraRepos: new AiInfraRepos(
        ctx.serverDB,
        ownerId,
        aiProvider as Record<string, ProviderConfig>,
      ),
      aiProviderModel: new AiProviderModel(ctx.serverDB, ownerId),
      callerIsAdmin,
      callerUserId: ctx.userId,
      configOwnerId: ownerId,
      gateKeeper,
      // Separate model scoped to the caller's own userId. Used for BYO-key
      // flows where non-admin users write only their own keyVaults.apiKey
      // to their own ai_providers row (not the admin's shared row).
      userAiProviderModel: new AiProviderModel(ctx.serverDB, ctx.userId),
      userModel: new UserModel(ctx.serverDB, ctx.userId),
    },
  });
});

const requireAdmin = (ctx: { callerIsAdmin: boolean }) => {
  if (!ctx.callerIsAdmin) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'admin only' });
  }
};

export const aiProviderRouter = router({
  checkProviderConnectivity: aiProviderProcedure
    .input(
      z.object({
        id: z.string(),
        model: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      requireAdmin(ctx);
      // Get the provider detail to find checkModel
      const detail = await ctx.aiInfraRepos.getAiProviderDetail(
        input.id,
        KeyVaultsGateKeeper.getUserKeyVaults,
      );

      const model = input.model || detail?.checkModel;
      if (!model) {
        return { error: 'No check model configured. Use --model to specify one.', ok: false };
      }

      try {
        const modelRuntime = await initModelRuntimeFromDB(ctx.serverDB, ctx.userId, input.id);

        const response = await modelRuntime.chat({
          messages: [{ content: 'Hi', role: 'user' }],
          model,
          stream: false,
          temperature: 0,
        });

        // If we get a response without error, connectivity is ok
        if (response.ok) {
          return { model, ok: true };
        }

        const errorBody = await response.text();
        return { error: errorBody, model, ok: false, status: response.status };
      } catch (error: any) {
        const errorType = error.errorType || error.type;
        const msg = errorType
          ? errorType
          : typeof error === 'string'
            ? error
            : error.message || (typeof error === 'object' ? JSON.stringify(error) : String(error));
        return { error: msg, model, ok: false };
      }
    }),

  createAiProvider: aiProviderProcedure
    .input(CreateAiProviderSchema)
    .mutation(async ({ input, ctx }) => {
      requireAdmin(ctx);
      try {
        const data = await ctx.aiProviderModel.create(input, ctx.gateKeeper.encrypt);
        return data?.id;
      } catch (error: any) {
        const pgErrorCode = error?.cause?.cause?.code || error?.cause?.code || error?.code;
        if (pgErrorCode === '23505') {
          throw new TRPCError({
            code: 'CONFLICT',
            message: `Provider "${input.id}" already exists`,
          });
        }
        throw error;
      }
    }),

  getAiProviderById: aiProviderProcedure
    .input(z.object({ id: z.string() }))

    .query(async ({ input, ctx }): Promise<AiProviderDetailItem | undefined> => {
      const detail = await ctx.aiInfraRepos.getAiProviderDetail(
        input.id,
        KeyVaultsGateKeeper.getUserKeyVaults,
      );

      if (!detail) return detail;

      // BYO-key: for non-admin users, overlay the user's own apiKey on top of
      // the admin's shared provider config. This lets the settings UI display
      // and edit the user's personal key while keeping baseURL/models intact.
      if (
        !ctx.callerIsAdmin &&
        detail.settings?.allowUserApiKey &&
        ctx.callerUserId !== ctx.configOwnerId
      ) {
        const userRow = await ctx.userAiProviderModel.getAiProviderById(
          input.id,
          KeyVaultsGateKeeper.getUserKeyVaults,
        );
        const userApiKey = (userRow?.keyVaults as any)?.apiKey ?? '';
        detail.keyVaults = { ...detail.keyVaults, apiKey: userApiKey };
      }

      return detail;
    }),

  getAiProviderList: aiProviderProcedure.query(async ({ ctx }) => {
    return await ctx.aiInfraRepos.getAiProviderList();
  }),

  getAiProviderRuntimeState: aiProviderProcedure
    .input(z.object({ isLogin: z.boolean().optional() }))
    .query(async ({ ctx }): Promise<AiProviderRuntimeState> => {
      const state = await ctx.aiInfraRepos.getAiProviderRuntimeState(
        KeyVaultsGateKeeper.getUserKeyVaults,
      );

      // For non-admin users: decide whether the admin's API keys may flow down
      // to the browser for client-mode fetch. Off by default (safer). Operators
      // in restricted-network environments can turn this on via /admin/settings.
      if (!ctx.callerIsAdmin && state?.runtimeConfig) {
        const allowClient = await new AppSettingsModel(ctx.serverDB).getAllowUsersClientFetch();

        if (!allowClient) {
          // Strip keys AND force server mode — the admin's key stays on server.
          for (const key of Object.keys(state.runtimeConfig)) {
            const cfg = state.runtimeConfig[key];
            if (cfg) cfg.fetchOnClient = false;
          }
        }

        // BYO-key overlay: for providers where the admin opted-in, replace the
        // shared admin apiKey with the caller's own apiKey so downstream usage
        // (model picker, settings form hydration) reflects the user's key.
        if (ctx.callerUserId !== ctx.configOwnerId) {
          const userRuntime = await ctx.userAiProviderModel.getAiProviderRuntimeConfig(
            KeyVaultsGateKeeper.getUserKeyVaults,
          );
          for (const [providerId, cfg] of Object.entries(state.runtimeConfig)) {
            if (!cfg?.settings?.allowUserApiKey) continue;
            const userKey = (userRuntime[providerId]?.keyVaults as any)?.apiKey ?? '';
            cfg.keyVaults = { ...cfg.keyVaults, apiKey: userKey };
          }
        }
        // When allowClient=true: leave keyVaults and fetchOnClient intact so the
        // browser can call the provider directly with admin's key. The admin
        // assumes the responsibility of deciding this is acceptable for their
        // deployment (e.g. trusted internal users behind a VPN, or a GFW/proxy
        // situation where only the client-side has outbound access).
      }
      return state;
    }),

  removeAiProvider: aiProviderProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      requireAdmin(ctx);
      return ctx.aiProviderModel.delete(input.id);
    }),

  toggleProviderEnabled: aiProviderProcedure
    .input(
      z.object({
        enabled: z.boolean(),
        id: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      requireAdmin(ctx);
      return ctx.aiProviderModel.toggleProviderEnabled(input.id, input.enabled);
    }),

  updateAiProvider: aiProviderProcedure
    .input(
      z.object({
        id: z.string(),
        value: UpdateAiProviderSchema,
      }),
    )
    .mutation(async ({ input, ctx }) => {
      requireAdmin(ctx);
      return ctx.aiProviderModel.update(input.id, input.value);
    }),

  updateAiProviderConfig: aiProviderProcedure
    .input(
      z.object({
        id: z.string(),
        value: UpdateAiProviderConfigSchema,
      }),
    )
    .mutation(async ({ input, ctx }) => {
      // Admin: writes to the shared admin-owned config as before.
      if (ctx.callerIsAdmin) {
        return ctx.aiProviderModel.updateConfig(
          input.id,
          input.value,
          ctx.gateKeeper.encrypt,
          KeyVaultsGateKeeper.getUserKeyVaults,
        );
      }

      // BYO-key: a non-admin caller is only allowed to write when the admin
      // has explicitly enabled allowUserApiKey for this provider, and only
      // the keyVaults.apiKey field may be written — to the caller's own row.
      const adminDetail = await ctx.aiInfraRepos.getAiProviderDetail(
        input.id,
        KeyVaultsGateKeeper.getUserKeyVaults,
      );
      if (!adminDetail?.settings?.allowUserApiKey) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'admin only' });
      }

      const apiKey = (input.value.keyVaults as Record<string, any> | undefined)?.apiKey;
      const restrictedValue = {
        keyVaults: { apiKey: typeof apiKey === 'string' ? apiKey : '' },
      };
      return ctx.userAiProviderModel.updateConfig(
        input.id,
        restrictedValue,
        ctx.gateKeeper.encrypt,
        KeyVaultsGateKeeper.getUserKeyVaults,
      );
    }),

  updateAiProviderOrder: aiProviderProcedure
    .input(
      z.object({
        sortMap: z.array(
          z.object({
            id: z.string(),
            sort: z.number(),
          }),
        ),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      requireAdmin(ctx);
      return ctx.aiProviderModel.updateOrder(input.sortMap);
    }),
});

export type AiProviderRouter = typeof aiProviderRouter;
