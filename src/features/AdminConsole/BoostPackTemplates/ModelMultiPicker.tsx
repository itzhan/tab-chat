'use client';

import { Flexbox } from '@lobehub/ui';
import { Checkbox, Collapse, Empty, Space, Tag } from 'antd';
import { memo, useMemo } from 'react';
import useSWR from 'swr';

import { lambdaClient } from '@/libs/trpc/client';

interface Props {
  onChange: (next: Array<{ providerId: string; modelId: string }>) => void;
  value: Array<{ providerId: string; modelId: string }>;
}

/** Cross-provider model multi-picker. Mirrors the plan quota editor UX so admins get a consistent pattern. */
const ModelMultiPicker = memo<Props>(({ value, onChange }) => {
  const { data: providers, isLoading } = useSWR('admin.providers.forPicker', () =>
    lambdaClient.aiProvider.getAiProviderList.query(),
  );
  const enabled = useMemo(() => (providers ?? []).filter((p: any) => p.enabled), [providers]);

  const selectedSet = useMemo(
    () => new Set(value.map((v) => `${v.providerId}|${v.modelId}`)),
    [value],
  );

  const toggle = (providerId: string, modelId: string, checked: boolean) => {
    const key = `${providerId}|${modelId}`;
    if (checked) {
      if (selectedSet.has(key)) return;
      onChange([...value, { providerId, modelId }]);
    } else {
      onChange(value.filter((v) => `${v.providerId}|${v.modelId}` !== key));
    }
  };

  const toggleMany = (providerId: string, modelIds: string[], on: boolean) => {
    const without = value.filter(
      (v) => v.providerId !== providerId || !modelIds.includes(v.modelId),
    );
    if (on) {
      const additions = modelIds.map((modelId) => ({ providerId, modelId }));
      onChange([...without, ...additions]);
    } else {
      onChange(without);
    }
  };

  if (isLoading) return <div>加载中...</div>;
  if (enabled.length === 0)
    return <Empty description="没有启用的服务商。请先在「设置 → 服务商」启用。" />;

  return (
    <Collapse
      defaultActiveKey={enabled.map((p: any) => p.id)}
      size="small"
      items={enabled.map((provider: any) => ({
        key: provider.id,
        label: (
          <Flexbox horizontal align="center" gap={8}>
            <b>{provider.name ?? provider.id}</b>
            <Tag>{provider.id}</Tag>
          </Flexbox>
        ),
        extra: (
          <SelectAllRow
            providerId={provider.id}
            onToggle={(ids, on) => toggleMany(provider.id, ids, on)}
          />
        ),
        children: (
          <ProviderModels
            providerId={provider.id}
            selectedSet={selectedSet}
            onToggle={(modelId, on) => toggle(provider.id, modelId, on)}
          />
        ),
      }))}
    />
  );
});

const SelectAllRow = memo<{
  providerId: string;
  onToggle: (modelIds: string[], selectAll: boolean) => void;
}>(({ providerId, onToggle }) => {
  const { data: models } = useSWR(`admin.models.${providerId}.enabled`, () =>
    lambdaClient.aiModel.getAiProviderModelList.query({
      enabled: true,
      id: providerId,
    }),
  );
  const ids = (models ?? []).map((m: any) => m.id);
  return (
    <Space size={4} onClick={(e) => e.stopPropagation()}>
      <a onClick={() => onToggle(ids, true)}>全选</a>
      <a onClick={() => onToggle(ids, false)}>取消</a>
    </Space>
  );
});

const ProviderModels = memo<{
  onToggle: (modelId: string, on: boolean) => void;
  providerId: string;
  selectedSet: Set<string>;
}>(({ providerId, onToggle, selectedSet }) => {
  const { data: models, isLoading } = useSWR(`admin.models.${providerId}.enabled`, () =>
    lambdaClient.aiModel.getAiProviderModelList.query({
      enabled: true,
      id: providerId,
    }),
  );

  if (isLoading) return <div>加载中...</div>;
  if (!models || models.length === 0) return <Empty description="此服务商下没有启用的模型" />;

  return (
    <Flexbox gap={6} style={{ maxHeight: 300, overflow: 'auto' }}>
      {models.map((m: any) => {
        const key = `${providerId}|${m.id}`;
        return (
          <Checkbox
            checked={selectedSet.has(key)}
            key={m.id}
            onChange={(e) => onToggle(m.id, e.target.checked)}
          >
            <span>{m.displayName ?? m.id}</span>
            <Tag style={{ marginInlineStart: 8 }}>{m.id}</Tag>
          </Checkbox>
        );
      })}
    </Flexbox>
  );
});

ModelMultiPicker.displayName = 'ModelMultiPicker';
SelectAllRow.displayName = 'BoostPackTemplates.SelectAllRow';
ProviderModels.displayName = 'BoostPackTemplates.ProviderModels';

export default ModelMultiPicker;
