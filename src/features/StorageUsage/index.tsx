'use client';

import { Flexbox } from '@lobehub/ui';
import { Progress, Tooltip } from 'antd';
import { memo } from 'react';
import useSWR from 'swr';

import { lambdaClient } from '@/libs/trpc/client';

const formatBytes = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  // keep one decimal except B / KB
  const precision = i >= 2 ? 2 : 0;
  return `${n.toFixed(precision)} ${units[i]}`;
};

interface StorageUsageProps {
  /** Compact header variant — smaller font, inline layout */
  compact?: boolean;
  showUploadCap?: boolean;
  title?: string;
}

/**
 * Visualize the current user's storage footprint vs. their plan quota.
 * Unlimited quota falls back to just showing how much has been used.
 */
const StorageUsage = memo<StorageUsageProps>(
  ({ title = '知识库存储用量', compact = false, showUploadCap = true }) => {
    const { data, isLoading } = useSWR('file.storageUsage', () =>
      lambdaClient.file.getStorageUsage.query(),
    );

    if (isLoading) return <div style={{ color: '#999' }}>加载中…</div>;
    if (!data) return null;

    const { usedBytes, quotaBytes, maxUploadBytes } = data;
    const isUnlimited = quotaBytes === 0;
    const percent = isUnlimited ? 0 : Math.min(100, Math.round((usedBytes / quotaBytes) * 100));
    const status = percent >= 100 ? 'exception' : percent >= 80 ? 'active' : 'normal';

    const usageLine = isUnlimited
      ? `已使用 ${formatBytes(usedBytes)}（套餐不限）`
      : `${formatBytes(usedBytes)} / ${formatBytes(quotaBytes)}`;

    const uploadCapNote =
      showUploadCap && maxUploadBytes > 0 ? `单文件上限 ${formatBytes(maxUploadBytes)}` : undefined;

    if (compact) {
      return (
        <Tooltip title={uploadCapNote}>
          <Flexbox horizontal align="center" gap={8}>
            <span style={{ color: '#666', fontSize: 12 }}>{title}</span>
            <span style={{ fontSize: 12 }}>{usageLine}</span>
            {!isUnlimited && (
              <Progress
                percent={percent}
                size="small"
                status={status}
                style={{ minWidth: 120, marginBottom: 0 }}
              />
            )}
          </Flexbox>
        </Tooltip>
      );
    }

    return (
      <Flexbox gap={8}>
        <Flexbox horizontal align="center" justify="space-between">
          <b>{title}</b>
          <span style={{ color: '#666' }}>{usageLine}</span>
        </Flexbox>
        {!isUnlimited && <Progress percent={percent} status={status} />}
        {uploadCapNote && <div style={{ color: '#999', fontSize: 12 }}>{uploadCapNote}</div>}
      </Flexbox>
    );
  },
);

export default StorageUsage;
