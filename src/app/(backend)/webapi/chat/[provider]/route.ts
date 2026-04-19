import { type ChatCompletionErrorPayload } from '@lobechat/model-runtime';
import { AGENT_RUNTIME_ERROR_SET } from '@lobechat/model-runtime';
import { ChatErrorType } from '@lobechat/types';

import { checkAuth } from '@/app/(backend)/middleware/auth';
import { createTraceOptions, initModelRuntimeFromDB } from '@/server/modules/ModelRuntime';
import { checkMessageQuota, recordMessageUsage } from '@/server/modules/QuotaGuard';
import { type ChatStreamPayload } from '@/types/openai/chat';
import { createErrorResponse } from '@/utils/errorResponse';
import { getTracePayload } from '@/utils/trace';

// If user don't use fluid compute, will build  failed
// this enforce user to enable fluid compute
export const maxDuration = 300;

export const POST = checkAuth(async (req: Request, { params, userId, serverDB }) => {
  const provider = (await params)!.provider!;

  let quotaDecision: { useBoost: boolean } | null = null;
  try {
    // ============  1. init chat model   ============ //
    const modelRuntime = await initModelRuntimeFromDB(serverDB, userId, provider);

    // ============  2. create chat completion   ============ //

    const data = (await req.json()) as ChatStreamPayload;

    // ============  2.5 commercial quota: check BEFORE model call (fail fast)  ============ //
    if (provider && data.model) {
      const decision = await checkMessageQuota(serverDB, userId, provider, data.model);
      quotaDecision = { useBoost: decision.useBoost };
    }

    const tracePayload = getTracePayload(req);

    let traceOptions = {};
    // If user enable trace
    if (tracePayload?.enabled) {
      traceOptions = createTraceOptions(data, { provider, trace: tracePayload });
    }

    const response = await modelRuntime.chat(data, {
      user: userId,
      ...traceOptions,
      signal: req.signal,
    });

    // ============  2.6 commercial quota: record ONLY when the stream completes successfully ==
    // If the client aborts, the upstream times out, or the stream errors out mid-flight,
    // the TransformStream's `flush` is never called → no deduction. This avoids charging
    // the user for failed generations.
    if (quotaDecision && data.model && response.body) {
      const { model } = data;
      const decision = quotaDecision;

      let sawErrorPayload = false;

      const monitored = response.body.pipeThrough(
        new TransformStream<Uint8Array, Uint8Array>({
          transform(chunk, controller) {
            controller.enqueue(chunk);
            // Best-effort sniff: lobechat sometimes wraps errors inside SSE payloads
            // like `event: error\n`. If we see that tag, treat the whole call as failed.
            try {
              const text = new TextDecoder().decode(chunk);
              if (/^event:\s*error\b/m.test(text)) sawErrorPayload = true;
            } catch {
              /* ignore decode errors for binary frames */
            }
          },
          flush() {
            if (sawErrorPayload) return;
            recordMessageUsage(serverDB, userId, provider, model, decision).catch((err) => {
              console.error('recordMessageUsage failed:', err);
            });
          },
        }),
      );

      return new Response(monitored, {
        headers: response.headers,
        status: response.status,
        statusText: response.statusText,
      });
    }

    return response;
  } catch (e) {
    const {
      errorType = ChatErrorType.InternalServerError,
      error: errorContent,
      ...res
    } = e as ChatCompletionErrorPayload;

    const error = errorContent || e;

    const logMethod = AGENT_RUNTIME_ERROR_SET.has(errorType as string) ? 'warn' : 'error';
    // track the error at server side
    // eslint-disable-next-line no-console
    console[logMethod](`Route: [${provider}] ${errorType}:`, error);

    return createErrorResponse(errorType, { error, ...res, provider });
  }
});
