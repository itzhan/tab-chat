import { type FetchSSEOptions } from '@lobechat/fetch-sse';
import {
  type LobeAgentChatConfig,
  type RuntimeInitialContext,
  type RuntimeStepContext,
  type TracePayload,
} from '@lobechat/types';

export interface FetchOptions extends FetchSSEOptions {
  agentId?: string;
  // Pre-resolved chat config of the target agent. When provided, getChatCompletion
  // skips re-reading the active-agent selector — important when target ≠ active.
  chatConfig?: LobeAgentChatConfig;
  historySummary?: string;
  /** Initial context for page editor (captured at operation start) */
  initialContext?: RuntimeInitialContext;
  signal?: AbortSignal | undefined;
  /** Step context for page editor (updated each step) */
  stepContext?: RuntimeStepContext;
  topicId?: string;
  trace?: TracePayload;
}
