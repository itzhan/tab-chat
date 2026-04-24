import { knowledgeBaseFiles } from '@lobechat/database/schemas';
import { TRPCError } from '@trpc/server';
import { and, eq, sql } from 'drizzle-orm';
import { z } from 'zod';

import { serverDBEnv } from '@/config/db';
import { KnowledgeBaseModel } from '@/database/models/knowledgeBase';
import { insertKnowledgeBasesSchema } from '@/database/schemas';
import { fileEnv } from '@/envs/file';
import { authedProcedure, router } from '@/libs/trpc/lambda';
import { serverDatabase } from '@/libs/trpc/lambda/middleware';
import { FileService } from '@/server/services/file';
import { type KnowledgeBaseItem } from '@/types/knowledgeBase';

export const KB_FILE_LIMIT_EXCEEDED = 'KB_FILE_LIMIT_EXCEEDED';

const knowledgeBaseProcedure = authedProcedure.use(serverDatabase).use(async (opts) => {
  const { ctx } = opts;

  return opts.next({
    ctx: {
      knowledgeBaseModel: new KnowledgeBaseModel(ctx.serverDB, ctx.userId),
    },
  });
});

export const knowledgeBaseRouter = router({
  addFilesToKnowledgeBase: knowledgeBaseProcedure
    .input(z.object({ ids: z.array(z.string()), knowledgeBaseId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      // Per-KB file-count cap. Checked server-side before insert so a client
      // can't sneak past by hitting the endpoint directly. 0 = unlimited.
      const maxPerKB = fileEnv.KB_MAX_FILES_PER_BASE;
      if (maxPerKB > 0) {
        const [{ cnt }] = await ctx.serverDB
          .select({ cnt: sql<number>`COUNT(*)` })
          .from(knowledgeBaseFiles)
          .where(
            and(
              eq(knowledgeBaseFiles.knowledgeBaseId, input.knowledgeBaseId),
              eq(knowledgeBaseFiles.userId, ctx.userId),
            ),
          );
        const current = Number(cnt ?? 0);
        if (current + input.ids.length > maxPerKB) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: `${KB_FILE_LIMIT_EXCEEDED}:${maxPerKB}:${current}`,
          });
        }
      }

      try {
        return await ctx.knowledgeBaseModel.addFilesToKnowledgeBase(
          input.knowledgeBaseId,
          input.ids,
        );
      } catch (e: any) {
        // Check for PostgreSQL unique constraint violation (code 23505)
        const pgErrorCode = e?.cause?.cause?.code || e?.cause?.code || e?.code;
        if (pgErrorCode === '23505') {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'FILE_ALREADY_IN_KNOWLEDGE_BASE',
          });
        }
        throw e;
      }
    }),

  createKnowledgeBase: knowledgeBaseProcedure
    .input(
      z.object({
        avatar: z.string().optional(),
        description: z.string().optional(),
        name: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const data = await ctx.knowledgeBaseModel.create({
        avatar: input.avatar,
        description: input.description,
        name: input.name,
      });

      return data?.id;
    }),

  getKnowledgeBaseById: knowledgeBaseProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }): Promise<KnowledgeBaseItem | undefined> => {
      return ctx.knowledgeBaseModel.findById(input.id);
    }),

  getKnowledgeBases: knowledgeBaseProcedure.query(async ({ ctx }): Promise<KnowledgeBaseItem[]> => {
    return ctx.knowledgeBaseModel.query();
  }),

  removeAllKnowledgeBases: knowledgeBaseProcedure.mutation(async ({ ctx }) => {
    const result = await ctx.knowledgeBaseModel.deleteAllWithFiles(serverDBEnv.REMOVE_GLOBAL_FILE);

    if (result.deletedFiles.length > 0) {
      const fileService = new FileService(ctx.serverDB, ctx.userId);
      const urls = result.deletedFiles.map((f) => f.url).filter(Boolean) as string[];
      if (urls.length > 0) {
        await fileService.deleteFiles(urls);
      }
    }
  }),

  removeFilesFromKnowledgeBase: knowledgeBaseProcedure
    .input(z.object({ ids: z.array(z.string()), knowledgeBaseId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      return ctx.knowledgeBaseModel.removeFilesFromKnowledgeBase(input.knowledgeBaseId, input.ids);
    }),

  removeKnowledgeBase: knowledgeBaseProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const result = await ctx.knowledgeBaseModel.deleteWithFiles(
        input.id,
        serverDBEnv.REMOVE_GLOBAL_FILE,
      );

      if (result.deletedFiles.length > 0) {
        const fileService = new FileService(ctx.serverDB, ctx.userId);
        const urls = result.deletedFiles.map((f) => f.url).filter(Boolean) as string[];
        if (urls.length > 0) {
          await fileService.deleteFiles(urls);
        }
      }
    }),

  updateKnowledgeBase: knowledgeBaseProcedure
    .input(
      z.object({
        id: z.string(),
        value: insertKnowledgeBasesSchema.partial(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      return ctx.knowledgeBaseModel.update(input.id, input.value);
    }),
});
