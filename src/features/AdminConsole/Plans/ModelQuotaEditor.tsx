'use client';

import { Flexbox } from '@lobehub/ui';
import {
  Alert,
  Button,
  Checkbox,
  Collapse,
  Empty,
  InputNumber,
  message,
  Modal,
  Space,
  Tag,
  Tooltip,
} from 'antd';
import { memo, useMemo, useState } from 'react';
import useSWR from 'swr';

import { lambdaClient } from '@/libs/trpc/client';
import { adminService } from '@/services/admin';

interface Props {
  onClose: () => void;
  planId: string;
}

const ModelQuotaEditor = memo<Props>(({ onClose, planId }) => {
  // 1) 已存在的配额 (planId → provider/model → limit)
  const existingKey = `admin.quotas.${planId}`;
  const { data: existing, mutate: refetchExisting } = useSWR(existingKey, () =>
    adminService.listModelQuotas(planId),
  );
  const existingMap = useMemo(() => {
    const map = new Map<string, number>();
    (existing ?? []).forEach((q: any) => {
      map.set(`${q.providerId}|${q.modelId}`, q.monthlyLimit);
    });
    return map;
  }, [existing]);

  // 2) 所有启用的服务商
  const { data: providers, isLoading: providersLoading } = useSWR('admin.providers.forQuota', () =>
    lambdaClient.aiProvider.getAiProviderList.query(),
  );
  const enabledProviders = useMemo(
    () => (providers ?? []).filter((p: any) => p.enabled),
    [providers],
  );

  // 3) 选中的模型 & 每个批量动作的月限额
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [monthlyLimit, setMonthlyLimit] = useState<number>(100);
  const [saving, setSaving] = useState(false);

  const toggle = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const onBatchApply = async () => {
    if (selected.size === 0) {
      message.warning('请先选择至少一个模型');
      return;
    }
    setSaving(true);
    try {
      await Promise.all(
        [...selected].map((key) => {
          const [providerId, modelId] = key.split('|');
          return adminService.upsertModelQuota({
            modelId,
            monthlyLimit,
            planId,
            providerId,
          });
        }),
      );
      message.success(`已为 ${selected.size} 个模型设置月限额 ${monthlyLimit}`);
      setSelected(new Set());
      refetchExisting();
    } catch (err: any) {
      message.error(err.message ?? '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const onRemove = async (providerId: string, modelId: string) => {
    await adminService.deleteModelQuota({ modelId, planId, providerId });
    refetchExisting();
  };

  return (
    <Modal
      open
      title={`套餐「${planId}」的模型额度`}
      width={880}
      footer={
        <Flexbox horizontal align="center" gap={12} justify="flex-end">
          <span style={{ color: '#888' }}>已选 {selected.size} 个模型</span>
          <Space.Compact>
            <InputNumber
              min={0}
              placeholder="月限额"
              style={{ width: 140 }}
              value={monthlyLimit}
              onChange={(v) => setMonthlyLimit(Number(v ?? 0))}
            />
          </Space.Compact>
          <Button
            disabled={selected.size === 0}
            loading={saving}
            type="primary"
            onClick={onBatchApply}
          >
            批量设置月限额
          </Button>
          <Button onClick={onClose}>关闭</Button>
        </Flexbox>
      }
      onCancel={onClose}
    >
      <Alert
        showIcon
        description="左侧选择模型（可跨服务商批量选），右下角输入月次数后点「批量设置月限额」。0 表示不限。已配置的会被覆盖。"
        message="使用说明"
        style={{ marginBottom: 16 }}
        type="info"
      />

      {providersLoading && <div>加载中...</div>}
      {!providersLoading && enabledProviders.length === 0 && (
        <Empty description="没有启用中的服务商。请先到「/settings/provider」启用服务商并启用对应模型。" />
      )}

      <Collapse
        defaultActiveKey={enabledProviders.map((p: any) => p.id)}
        size="small"
        items={enabledProviders.map((provider: any) => ({
          extra: (
            <ProviderSelectAllButton
              enabledProviderId={provider.id}
              onBatchToggle={(modelIds, selectAll) => {
                setSelected((prev) => {
                  const next = new Set(prev);
                  modelIds.forEach((mid) => {
                    const key = `${provider.id}|${mid}`;
                    if (selectAll) next.add(key);
                    else next.delete(key);
                  });
                  return next;
                });
              }}
            />
          ),
          key: provider.id,
          label: (
            <Flexbox horizontal align="center" gap={8}>
              <b>
                {provider.logo ? '' : ''}
                {provider.name ?? provider.id}
              </b>
              <Tag>{provider.id}</Tag>
            </Flexbox>
          ),
          children: (
            <ProviderModelList
              existingMap={existingMap}
              providerId={provider.id}
              selected={selected}
              onRemoveExisting={onRemove}
              onToggle={toggle}
            />
          ),
        }))}
      />
    </Modal>
  );
});

const ProviderSelectAllButton = memo<{
  enabledProviderId: string;
  onBatchToggle: (modelIds: string[], selectAll: boolean) => void;
}>(({ enabledProviderId, onBatchToggle }) => {
  const { data: models } = useSWR(`admin.models.${enabledProviderId}.enabled`, () =>
    lambdaClient.aiModel.getAiProviderModelList.query({
      enabled: true,
      id: enabledProviderId,
    }),
  );

  const allIds = (models ?? []).map((m: any) => m.id);

  return (
    <Space size={4} onClick={(e) => e.stopPropagation()}>
      <Tooltip title="全选本服务商下所有已启用模型">
        <Button size="small" type="link" onClick={() => onBatchToggle(allIds, true)}>
          全选
        </Button>
      </Tooltip>
      <Button size="small" type="link" onClick={() => onBatchToggle(allIds, false)}>
        取消
      </Button>
    </Space>
  );
});

const ProviderModelList = memo<{
  existingMap: Map<string, number>;
  onRemoveExisting: (providerId: string, modelId: string) => void;
  onToggle: (key: string) => void;
  providerId: string;
  selected: Set<string>;
}>(({ existingMap, onRemoveExisting, onToggle, providerId, selected }) => {
  const { data: models, isLoading } = useSWR(`admin.models.${providerId}.enabled`, () =>
    lambdaClient.aiModel.getAiProviderModelList.query({
      enabled: true,
      id: providerId,
    }),
  );

  if (isLoading) return <div style={{ color: '#888' }}>加载模型...</div>;
  if (!models || models.length === 0) {
    return (
      <div style={{ color: '#888' }}>
        该服务商下没有已启用的模型。先到「/settings/provider/{providerId}」启用模型。
      </div>
    );
  }

  return (
    <Flexbox gap={4}>
      {models.map((m: any) => {
        const key = `${providerId}|${m.id}`;
        const existing = existingMap.get(key);
        const isChecked = selected.has(key);
        return (
          <Flexbox horizontal align="center" gap={12} key={key} style={{ padding: '2px 0' }}>
            <Checkbox checked={isChecked} onChange={() => onToggle(key)}>
              <span style={{ fontFamily: 'monospace' }}>{m.id}</span>
              {m.displayName && m.displayName !== m.id ? (
                <span style={{ color: '#888', marginLeft: 8 }}>{m.displayName}</span>
              ) : null}
            </Checkbox>
            {existing !== undefined && (
              <Tag color={existing === 0 ? 'blue' : 'green'}>
                当前: {existing === 0 ? '不限' : `${existing}/月`}
              </Tag>
            )}
            {existing !== undefined && (
              <Button
                danger
                size="small"
                type="link"
                onClick={() => onRemoveExisting(providerId, m.id)}
              >
                移除
              </Button>
            )}
          </Flexbox>
        );
      })}
    </Flexbox>
  );
});

export default ModelQuotaEditor;
