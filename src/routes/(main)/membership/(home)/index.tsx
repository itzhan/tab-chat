'use client';

import { Block, Flexbox, Icon, Tag, Text } from '@lobehub/ui';
import { Button, message, Spin, Typography } from 'antd';
import { createStyles } from 'antd-style';
import { CheckIcon, CrownIcon, ZapIcon } from 'lucide-react';
import { memo, useState } from 'react';
import useSWR from 'swr';

import { subscriptionService } from '@/services/subscription';

const { Title } = Typography;

const useStyles = createStyles(({ css, token }) => ({
  activeTag: css`
    border: none;
    color: ${token.colorWhite};
    background: ${token.colorPrimary};
  `,
  card: css`
    position: relative;

    display: flex;
    flex-direction: column;
    gap: 16px;

    min-width: 280px;
    max-width: 360px;
    padding: 24px;
    border: 1px solid ${token.colorBorderSecondary};
    border-radius: 12px;

    background: ${token.colorBgContainer};
  `,
  cardHighlight: css`
    border-color: ${token.colorPrimary};
    box-shadow: 0 8px 24px ${token.colorPrimaryBg};
  `,
  quotaRow: css`
    display: flex;
    gap: 8px;
    align-items: center;

    padding-block: 4px;
    padding-inline: 0;

    color: ${token.colorTextSecondary};
  `,
  container: css`
    width: 100%;
    max-width: 1200px;
    margin-block: 0;
    margin-inline: auto;
    padding-block: 48px;
    padding-inline: 32px;
  `,
}));

const formatStorage = (bytes: number) => {
  if (!bytes) return '不限';
  const mb = bytes / 1024 / 1024;
  if (mb < 1024) return `${mb.toFixed(0)} MB`;
  return `${(mb / 1024).toFixed(1)} GB`;
};

const MembershipHomePage = memo(() => {
  const { styles, cx } = useStyles();
  const [pendingPlan, setPendingPlan] = useState<string | null>(null);

  const { data: plans, isLoading: plansLoading } = useSWR('membership.plans', () =>
    subscriptionService.listPlans(),
  );

  const { data: mySub } = useSWR('membership.me', () => subscriptionService.me());

  const activePlanId = mySub?.plan?.id;

  const onPurchase = async (planId: string) => {
    try {
      setPendingPlan(planId);
      await subscriptionService.requestUpgrade(planId, 'requested from membership page');
      message.success('已记录你的购买意向，我们会尽快与你联系开通');
    } catch (err: any) {
      message.error(err.message ?? '提交失败，请稍后重试');
    } finally {
      setPendingPlan(null);
    }
  };

  return (
    <div className={styles.container}>
      <Flexbox gap={24}>
        <Flexbox gap={8}>
          <Flexbox horizontal align={'center'} gap={8}>
            <Icon icon={CrownIcon} size={24} />
            <Title level={2} style={{ margin: 0 }}>
              订阅中心
            </Title>
          </Flexbox>
          <Text type={'secondary'}>
            升级套餐解锁更多模型和更高额度。
            {mySub?.plan && (
              <>
                {' '}
                当前套餐：
                <b>{mySub.plan.name}</b>
                {mySub.subscription?.expireAt
                  ? `（到期时间：${new Date(mySub.subscription.expireAt).toLocaleDateString()}）`
                  : ''}
              </>
            )}
          </Text>
        </Flexbox>

        {plansLoading ? (
          <Flexbox align={'center'} height={240} justify={'center'}>
            <Spin />
          </Flexbox>
        ) : !plans?.length ? (
          <Block style={{ padding: 32, textAlign: 'center' }}>
            <Text type={'secondary'}>暂无可购买的套餐，请联系管理员配置</Text>
          </Block>
        ) : (
          <Flexbox horizontal gap={16} wrap={'wrap'}>
            {plans.map((plan: any) => {
              const isActive = plan.id === activePlanId;
              return (
                <div className={cx(styles.card, isActive && styles.cardHighlight)} key={plan.id}>
                  <Flexbox gap={8}>
                    <Flexbox horizontal align={'center'} gap={8}>
                      <Title level={4} style={{ margin: 0 }}>
                        {plan.name}
                      </Title>
                      {isActive && <Tag className={styles.activeTag}>当前套餐</Tag>}
                      {plan.isDefault && !isActive && <Tag>默认</Tag>}
                    </Flexbox>
                    {plan.description && (
                      <Text style={{ minHeight: 44 }} type={'secondary'}>
                        {plan.description}
                      </Text>
                    )}
                  </Flexbox>

                  <Flexbox gap={4}>
                    <div className={styles.quotaRow}>
                      <Icon icon={CheckIcon} size={14} />
                      知识库容量：{formatStorage(plan.storageQuotaBytes)}
                    </div>
                    {plan.modelQuotas?.length ? (
                      plan.modelQuotas.slice(0, 6).map((q: any) => (
                        <div className={styles.quotaRow} key={`${q.providerId}-${q.modelId}`}>
                          <Icon icon={CheckIcon} size={14} />
                          {q.providerId === '*' && q.modelId === '*'
                            ? '全部模型'
                            : `${q.providerId}/${q.modelId}`}
                          ：每月{q.monthlyLimit}次
                        </div>
                      ))
                    ) : (
                      <div className={styles.quotaRow}>
                        <Icon icon={CheckIcon} size={14} />
                        基础模型访问
                      </div>
                    )}
                    {plan.modelQuotas?.length > 6 && (
                      <div className={styles.quotaRow}>
                        …共 {plan.modelQuotas.length} 项模型权益
                      </div>
                    )}
                  </Flexbox>

                  <Flexbox style={{ marginTop: 'auto' }}>
                    <Button
                      block
                      disabled={isActive}
                      loading={pendingPlan === plan.id}
                      size={'large'}
                      type={isActive ? 'default' : 'primary'}
                      onClick={() => onPurchase(plan.id)}
                    >
                      {isActive ? '已开通' : '购买'}
                    </Button>
                  </Flexbox>
                </div>
              );
            })}
          </Flexbox>
        )}

        <BoostPackSection />

        <Text style={{ fontSize: 12, marginTop: 24 }} type={'secondary'}>
          支付渠道（支付宝 / 微信）正在接入中。点击「购买」会记录你的意向，开通后我们会主动联系你。
        </Text>
      </Flexbox>
    </div>
  );
});

MembershipHomePage.displayName = 'MembershipHomePage';

const BoostPackSection = memo(() => {
  const { styles } = useStyles();
  const [pending, setPending] = useState<string | null>(null);

  const { data: packs, isLoading } = useSWR('membership.boostPacks', () =>
    subscriptionService.getMyBoostPackTemplates(),
  );

  if (isLoading) {
    return (
      <Flexbox align={'center'} justify={'center'} padding={32}>
        <Spin />
      </Flexbox>
    );
  }
  if (!packs || packs.length === 0) {
    return null;
  }

  const onBuy = async (templateId: string, quantity: number) => {
    const key = `${templateId}:${quantity}`;
    try {
      setPending(key);
      await subscriptionService.requestBoostPurchase(templateId, quantity, 'from membership page');
      message.success('已记录购买意向，支付开通后即刻生效');
    } catch (err: any) {
      message.error(err.message ?? '提交失败');
    } finally {
      setPending(null);
    }
  };

  return (
    <Flexbox gap={16}>
      <Flexbox horizontal align={'center'} gap={8} style={{ marginTop: 32 }}>
        <Icon icon={ZapIcon} size={20} />
        <Title level={3} style={{ margin: 0 }}>
          加油包
        </Title>
      </Flexbox>
      <Text type={'secondary'}>套餐额度不够？按需购买加油包，每个包对应一组模型的共享次数池。</Text>

      <Flexbox horizontal gap={16} wrap={'wrap'}>
        {packs.map((pack: any) => (
          <div className={styles.card} key={pack.id}>
            <Flexbox gap={4}>
              <Title level={4} style={{ margin: 0 }}>
                {pack.name}
              </Title>
              {pack.description && (
                <Text style={{ minHeight: 36 }} type={'secondary'}>
                  {pack.description}
                </Text>
              )}
            </Flexbox>

            <Flexbox gap={4}>
              <div style={{ color: '#888', fontSize: 12 }}>包含模型（共享额度）：</div>
              <Flexbox horizontal gap={4} wrap={'wrap'}>
                {(pack.models ?? []).slice(0, 8).map((m: any) => (
                  <Tag key={`${m.providerId}:${m.modelId}`}>{m.modelId}</Tag>
                ))}
                {pack.models?.length > 8 && <Tag>+{pack.models.length - 8}</Tag>}
              </Flexbox>
              <div style={{ color: '#888', fontSize: 12, marginTop: 4 }}>
                每单位 {pack.quotaPerUnit} 次
              </div>
            </Flexbox>

            <Flexbox gap={6} style={{ marginTop: 'auto' }}>
              {(pack.pricingTiers ?? []).map((tier: any) => {
                const totalQuota = tier.quantity * pack.quotaPerUnit;
                const pendingKey = `${pack.id}:${tier.quantity}`;
                return (
                  <Button
                    block
                    key={tier.quantity}
                    loading={pending === pendingKey}
                    type={tier.label === '推荐' ? 'primary' : 'default'}
                    onClick={() => onBuy(pack.id, tier.quantity)}
                  >
                    <Flexbox horizontal align={'center'} gap={8} justify={'space-between'}>
                      <span>
                        {tier.quantity}× 单位
                        {tier.label && (
                          <Tag color="orange" style={{ marginInlineStart: 6 }}>
                            {tier.label}
                          </Tag>
                        )}
                      </span>
                      <span>
                        ¥{tier.price}
                        <span style={{ color: '#888', fontSize: 11, marginInlineStart: 6 }}>
                          （共 {totalQuota} 次）
                        </span>
                      </span>
                    </Flexbox>
                  </Button>
                );
              })}
            </Flexbox>
          </div>
        ))}
      </Flexbox>
    </Flexbox>
  );
});

BoostPackSection.displayName = 'BoostPackSection';

export default MembershipHomePage;
