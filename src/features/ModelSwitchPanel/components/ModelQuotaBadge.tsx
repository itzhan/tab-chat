'use client';

import { Tag } from 'antd';
import { memo } from 'react';

import { useModelQuota } from './ModelQuotaProvider';

interface Props {
  modelId: string;
  providerId: string;
}

/** Compact remaining-quota tag shown inside the model switcher popup row. */
const ModelQuotaBadge = memo<Props>(({ providerId, modelId }) => {
  const quota = useModelQuota(providerId, modelId);
  if (!quota) return null;

  const { monthlyLimit, used, boostRemaining } = quota;
  const pieces: string[] = [];

  if (monthlyLimit !== null) {
    const remaining = Math.max(monthlyLimit - used, 0);
    pieces.push(`${remaining}/${monthlyLimit}`);
  } else if (boostRemaining > 0) {
    // No plan quota, but boost packs grant some runs
  } else {
    // Neither plan nor boost — hide silently to avoid cluttering rows without entitlements
    return null;
  }

  if (boostRemaining > 0) pieces.push(`+${boostRemaining}`);

  const color =
    monthlyLimit !== null && used >= monthlyLimit && boostRemaining === 0 ? 'red' : undefined;

  return (
    <Tag color={color} style={{ fontSize: 11, marginInlineEnd: 0 }}>
      {pieces.join(' ')}
    </Tag>
  );
});

ModelQuotaBadge.displayName = 'ModelQuotaBadge';

export default ModelQuotaBadge;
