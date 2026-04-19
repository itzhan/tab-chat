'use client';

import { Flexbox } from '@lobehub/ui';
import { Alert, Card, Progress, Table, Tag } from 'antd';
import dayjs from 'dayjs';
import { memo, useMemo } from 'react';
import useSWR from 'swr';

import { subscriptionService } from '@/services/subscription';

const MySubscriptionPage = memo(() => {
  const { data: me, isLoading } = useSWR('me.subscription', () => subscriptionService.me());
  const { data: usage } = useSWR('me.usage', () => subscriptionService.myUsage());
  const { data: boosts } = useSWR('me.boosts', () => subscriptionService.myBoostPacks());

  const usageMap = useMemo(() => {
    const map: Record<string, number> = {};
    (usage ?? []).forEach((u: any) => {
      map[`${u.providerId}|${u.modelId}`] = u.messageCount;
    });
    return map;
  }, [usage]);

  if (isLoading) return <Flexbox padding={32}>加载中...</Flexbox>;

  if (!me?.plan) {
    return (
      <Flexbox padding={32}>
        <Alert
          showIcon
          description="请联系管理员为您分配订阅套餐。"
          message="未分配套餐"
          type="warning"
        />
      </Flexbox>
    );
  }

  const { plan, subscription, quotas } = me;

  return (
    <Flexbox gap={16} padding={32}>
      <h2 style={{ margin: 0 }}>我的会员</h2>

      <Card title="当前套餐">
        <Flexbox gap={8}>
          <div>
            <b>{plan.name}</b> <Tag color="blue">{subscription.status}</Tag>
          </div>
          {plan.description && <div style={{ color: '#666' }}>{plan.description}</div>}
          <div>
            到期时间：
            {subscription.expireAt
              ? dayjs(subscription.expireAt).format('YYYY-MM-DD HH:mm')
              : '永久'}
          </div>
          <div>
            知识库容量：
            {plan.storageQuotaBytes === 0
              ? '不限'
              : `${(plan.storageQuotaBytes / 1024 / 1024).toFixed(0)} MB`}
          </div>
        </Flexbox>
      </Card>

      <Card title="本月模型用量">
        <Table
          dataSource={quotas ?? []}
          pagination={false}
          rowKey={(r: any) => `${r.providerId}|${r.modelId}`}
          size="small"
          columns={[
            { dataIndex: 'providerId', title: '服务商' },
            { dataIndex: 'modelId', title: '模型' },
            {
              dataIndex: 'monthlyLimit',
              render: (limit: number, row: any) => {
                if (limit === 0) return '不限';
                const used = usageMap[`${row.providerId}|${row.modelId}`] ?? 0;
                const percent = Math.min(100, Math.round((used / limit) * 100));
                return (
                  <Flexbox gap={4} style={{ minWidth: 220 }}>
                    <span>
                      {used} / {limit}
                    </span>
                    <Progress
                      percent={percent}
                      size="small"
                      status={percent >= 100 ? 'exception' : 'normal'}
                    />
                  </Flexbox>
                );
              },
              title: '本月用量',
            },
          ]}
        />
      </Card>

      <Card title="我的加油包">
        <Table
          dataSource={boosts ?? []}
          locale={{ emptyText: '暂无加油包。额度不够时请联系管理员发放。' }}
          pagination={false}
          rowKey="id"
          size="small"
          columns={[
            { dataIndex: 'providerId', title: '服务商' },
            { dataIndex: 'modelId', title: '模型' },
            { dataIndex: 'remainingCount', title: '剩余次数' },
            {
              dataIndex: 'expireAt',
              render: (v: string | null) => (v ? dayjs(v).format('YYYY-MM-DD') : '永久'),
              title: '到期',
            },
            { dataIndex: 'grantedReason', title: '备注' },
          ]}
        />
      </Card>

      <Alert
        showIcon
        description="若需升级套餐或购买加油包，请联系管理员。"
        message="提示"
        type="info"
      />
    </Flexbox>
  );
});

export default MySubscriptionPage;
