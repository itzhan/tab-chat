'use client';

import { Flexbox, Text } from '@lobehub/ui';
import { Button, Card, message, Modal, Tag, Tooltip } from 'antd';
import { Check, Crown } from 'lucide-react';
import { memo, useMemo, useState } from 'react';
import useSWR from 'swr';

import { subscriptionService } from '@/services/subscription';

const formatStorage = (bytes: number) => {
  if (bytes === 0) return '不限';
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  return `${(bytes / 1024 ** 2).toFixed(0)} MB`;
};

const SubscriptionPlans = memo(() => {
  const { data: plans } = useSWR('home.plans', () => subscriptionService.listPlans());
  const { data: me, mutate: refetchMe } = useSWR('home.plans.me', () => subscriptionService.me());

  const [picking, setPicking] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const currentPlanId = me?.plan?.id;

  const onConfirmUpgrade = async () => {
    if (!picking) return;
    setSubmitting(true);
    try {
      await subscriptionService.requestUpgrade(picking.id);
      message.success('订购请求已提交，管理员会尽快处理');
      setPicking(null);
      refetchMe();
    } catch (err: any) {
      message.error(err.message ?? '提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  const summary = useMemo(() => {
    return (plans ?? []).map((p: any) => {
      const totalModels = (p.modelQuotas ?? []).length;
      const unlimitedModels = (p.modelQuotas ?? []).filter((q: any) => q.monthlyLimit === 0).length;
      return {
        ...p,
        summary: { totalModels, unlimitedModels },
      };
    });
  }, [plans]);

  if (!plans || plans.length === 0) return null;

  return (
    <Flexbox gap={16}>
      <Flexbox horizontal align="center" gap={8}>
        <Crown size={18} />
        <Text as="h3" style={{ margin: 0 }}>
          订阅套餐
        </Text>
      </Flexbox>

      <Flexbox horizontal gap={16} style={{ flexWrap: 'wrap' }}>
        {summary.map((plan: any) => {
          const isCurrent = plan.id === currentPlanId;
          return (
            <Card
              hoverable
              key={plan.id}
              style={{
                border: isCurrent ? '2px solid #1677ff' : undefined,
                flex: '1 1 260px',
                maxWidth: 360,
                minWidth: 240,
              }}
              title={
                <Flexbox horizontal align="center" gap={8}>
                  <span>{plan.name}</span>
                  {plan.isDefault && <Tag color="default">默认</Tag>}
                  {isCurrent && <Tag color="blue">当前套餐</Tag>}
                </Flexbox>
              }
            >
              <Flexbox gap={10} style={{ minHeight: 140 }}>
                {plan.description && (
                  <div style={{ color: '#666', fontSize: 13 }}>{plan.description}</div>
                )}
                <Flexbox gap={6}>
                  <Flexbox horizontal align="center" gap={6}>
                    <Check color="#52c41a" size={14} />
                    <span>知识库空间：{formatStorage(plan.storageQuotaBytes)}</span>
                  </Flexbox>
                  <Flexbox horizontal align="center" gap={6}>
                    <Check color="#52c41a" size={14} />
                    <Tooltip
                      title={(plan.modelQuotas ?? [])
                        .map(
                          (q: any) =>
                            `${q.providerId}/${q.modelId}: ${q.monthlyLimit === 0 ? '不限' : q.monthlyLimit + '次/月'}`,
                        )
                        .join('\n')}
                    >
                      <span style={{ borderBottom: '1px dashed #999', cursor: 'help' }}>
                        可用模型 {plan.summary.totalModels} 个
                        {plan.summary.unlimitedModels > 0
                          ? `（${plan.summary.unlimitedModels} 个不限次数）`
                          : ''}
                      </span>
                    </Tooltip>
                  </Flexbox>
                </Flexbox>

                <Button
                  block
                  disabled={isCurrent}
                  style={{ marginTop: 'auto' }}
                  type={isCurrent ? 'default' : 'primary'}
                  onClick={() => setPicking(plan)}
                >
                  {isCurrent ? '已是当前套餐' : '订购此套餐'}
                </Button>
              </Flexbox>
            </Card>
          );
        })}
      </Flexbox>

      <Modal
        confirmLoading={submitting}
        okText="提交订购请求"
        open={!!picking}
        title={`订购「${picking?.name ?? ''}」套餐`}
        onCancel={() => setPicking(null)}
        onOk={onConfirmUpgrade}
      >
        <p>支付功能暂未上线，提交后我们会记录你的订购请求，管理员审核后为你开通。</p>
        <p style={{ color: '#999', fontSize: 13 }}>如需加急，请联系管理员。订购不会立即扣费。</p>
      </Modal>
    </Flexbox>
  );
});

export default SubscriptionPlans;
