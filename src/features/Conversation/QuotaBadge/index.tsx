'use client';

import { Flexbox } from '@lobehub/ui';
import { Progress, Tooltip } from 'antd';
import { Crown, Zap } from 'lucide-react';
import { memo, useEffect, useRef } from 'react';
import useSWR from 'swr';

import { subscriptionService } from '@/services/subscription';
import { useAgentStore } from '@/store/agent';
import { agentSelectors } from '@/store/agent/selectors';
import { useChatStore } from '@/store/chat';
import { operationSelectors } from '@/store/chat/selectors';
import { useUserStore } from '@/store/user';
import { userProfileSelectors } from '@/store/user/selectors';

/**
 * Quota pill shown above the chat input. Auto-refreshes when the AI finishes
 * generating so the user sees plan/boost deduction immediately.
 */
const QuotaBadge = memo(() => {
  const isAdmin = useUserStore(userProfileSelectors.isAdmin);
  const model = useAgentStore(agentSelectors.currentAgentModel);
  const provider = useAgentStore(agentSelectors.currentAgentModelProvider);
  const isAIGenerating = useChatStore(operationSelectors.isAIGenerating);

  const swrKey = provider && model ? `quota:${provider}:${model}` : null;
  const { data, mutate } = useSWR(
    swrKey,
    () => subscriptionService.myModelQuota(provider!, model!),
    { refreshInterval: 30_000 },
  );

  // Refresh when AI generation transitions from true → false (message just finished).
  const wasGeneratingRef = useRef(false);
  useEffect(() => {
    if (wasGeneratingRef.current && !isAIGenerating) {
      // Small delay so server-side recordMessageUsage commits before refetch
      const t = setTimeout(() => mutate(), 400);
      return () => clearTimeout(t);
    }
    wasGeneratingRef.current = isAIGenerating;
  }, [isAIGenerating, mutate]);

  if (isAdmin) {
    return (
      <Flexbox
        horizontal
        align="center"
        gap={6}
        style={{
          background: 'rgba(103, 58, 183, 0.10)',
          borderRadius: 14,
          color: '#673ab7',
          fontSize: 12,
          padding: '4px 12px',
        }}
      >
        <Crown size={12} />
        <span>管理员 · 不限次数</span>
      </Flexbox>
    );
  }

  if (!data) return null;
  if (data.monthlyLimit === null) {
    return (
      <Flexbox
        horizontal
        align="center"
        gap={6}
        style={{
          background: 'rgba(255, 99, 99, 0.10)',
          borderRadius: 14,
          color: '#c43',
          fontSize: 12,
          padding: '4px 12px',
        }}
      >
        <Crown size={12} />
        <span>当前套餐未开通此模型</span>
      </Flexbox>
    );
  }

  const { monthlyLimit, used, boostRemaining } = data;
  const unlimited = monthlyLimit === 0;
  const remaining = unlimited ? Infinity : Math.max(0, monthlyLimit - used);
  const percent = unlimited ? 0 : Math.min(100, Math.round((used / monthlyLimit) * 100));
  const runningLow = !unlimited && percent >= 80;
  const totalAvailable = unlimited ? null : remaining + boostRemaining;
  const hasBoost = boostRemaining > 0;

  return (
    <Tooltip
      title={
        <Flexbox gap={6} style={{ minWidth: 220 }}>
          <div style={{ fontSize: 11, opacity: 0.7 }}>
            {provider} · {model}
          </div>
          <Flexbox horizontal align="center" gap={6} justify="space-between">
            <span>
              <Crown size={11} style={{ marginInlineEnd: 4, verticalAlign: '-1px' }} />
              套餐额度
            </span>
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>
              {unlimited ? '不限' : `${remaining} / ${monthlyLimit}`}
            </span>
          </Flexbox>
          <Flexbox horizontal align="center" gap={6} justify="space-between">
            <span>
              <Zap size={11} style={{ marginInlineEnd: 4, verticalAlign: '-1px' }} />
              加油包额度
            </span>
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>
              {boostRemaining > 0 ? `${boostRemaining}` : '无'}
            </span>
          </Flexbox>
          {totalAvailable !== null && (
            <div
              style={{
                borderTop: '1px solid rgba(255,255,255,0.15)',
                display: 'flex',
                fontWeight: 600,
                justifyContent: 'space-between',
                marginTop: 2,
                paddingTop: 6,
              }}
            >
              <span>总剩余</span>
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>{totalAvailable} 次</span>
            </div>
          )}
          <div style={{ color: '#aaa', fontSize: 11, marginTop: 2 }}>
            扣费顺序：优先套餐 → 加油包
          </div>
          {!unlimited && remaining === 0 && boostRemaining === 0 && (
            <div style={{ color: '#faa' }}>额度已用完，可升级套餐或购买加油包。</div>
          )}
        </Flexbox>
      }
    >
      <Flexbox
        horizontal
        align="center"
        gap={10}
        style={{
          background: runningLow ? 'rgba(250, 173, 20, 0.10)' : 'rgba(120, 120, 120, 0.06)',
          borderRadius: 14,
          color: runningLow ? '#d88600' : 'inherit',
          cursor: 'help',
          fontSize: 12,
          padding: '4px 12px',
        }}
      >
        {/* Plan segment */}
        <Flexbox horizontal align="center" gap={6}>
          <Crown size={12} />
          {unlimited ? (
            <span>套餐 · 不限</span>
          ) : (
            <>
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                套餐 {remaining}/{monthlyLimit}
              </span>
              <Progress
                percent={percent}
                showInfo={false}
                size={{ height: 4, width: 48 }}
                status={percent >= 100 ? 'exception' : runningLow ? 'active' : 'normal'}
              />
            </>
          )}
        </Flexbox>

        {/* Divider */}
        {hasBoost && (
          <span
            aria-hidden
            style={{
              background: 'currentColor',
              display: 'inline-block',
              height: 12,
              opacity: 0.2,
              width: 1,
            }}
          />
        )}

        {/* Boost segment */}
        {hasBoost && (
          <Flexbox horizontal align="center" gap={4}>
            <Zap size={12} />
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>加油包 {boostRemaining}</span>
          </Flexbox>
        )}
      </Flexbox>
    </Tooltip>
  );
});

QuotaBadge.displayName = 'QuotaBadge';

export default QuotaBadge;
