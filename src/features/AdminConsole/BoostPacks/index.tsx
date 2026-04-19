'use client';

import { Flexbox } from '@lobehub/ui';
import {
  Button,
  DatePicker,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Radio,
  Select,
  Table,
  Tag,
} from 'antd';
import dayjs from 'dayjs';
import { memo, useState } from 'react';
import useSWR from 'swr';

import { adminService } from '@/services/admin';

const BoostPacksPage = memo(() => {
  const { data, isLoading, mutate } = useSWR('admin.boostPacks', () =>
    adminService.listBoostPacks(),
  );
  const { data: users } = useSWR('admin.users.forSelect', () => adminService.listUsers());
  const { data: templates } = useSWR('admin.boostPacks.templates', () =>
    adminService.getBoostPackTemplates(),
  );

  const [creating, setCreating] = useState(false);
  const [mode, setMode] = useState<'template' | 'custom'>('template');
  const [form] = Form.useForm();

  const onGrant = async () => {
    const values = await form.validateFields();
    if (mode === 'template') {
      await adminService.grantBoostPackFromTemplate({
        expireAt: values.expireAt ? values.expireAt.toISOString() : null,
        grantedReason: values.grantedReason,
        quantity: values.quantity,
        templateId: values.templateId,
        userId: values.userId,
      });
    } else {
      await adminService.grantBoostPack({
        expireAt: values.expireAt ? values.expireAt.toISOString() : null,
        grantedReason: values.grantedReason,
        modelId: values.modelId,
        providerId: values.providerId,
        remainingCount: values.remainingCount,
        userId: values.userId,
      });
    }
    message.success('已发放');
    setCreating(false);
    form.resetFields();
    mutate();
  };

  const onRevoke = async (id: string) => {
    Modal.confirm({
      title: '撤销加油包？',
      onOk: async () => {
        await adminService.revokeBoostPack(id);
        mutate();
      },
    });
  };

  const columns = [
    { dataIndex: 'email', title: '用户' },
    {
      key: 'coverage',
      render: (_: any, r: any) => {
        if (Array.isArray(r.modelIds) && r.modelIds.length > 0) {
          return (
            <Flexbox gap={4}>
              <Tag color="purple">{r.label ?? '模板包'}</Tag>
              <span style={{ color: '#888', fontSize: 11 }}>{r.modelIds.length} 个模型共享</span>
            </Flexbox>
          );
        }
        return (
          <span>
            {r.providerId} / {r.modelId}
          </span>
        );
      },
      title: '覆盖模型',
    },
    { dataIndex: 'remainingCount', title: '剩余次数' },
    {
      dataIndex: 'expireAt',
      render: (v: string | null) => (v ? dayjs(v).format('YYYY-MM-DD') : '永久'),
      title: '到期',
    },
    {
      dataIndex: 'createdAt',
      render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm'),
      title: '发放时间',
    },
    {
      key: 'actions',
      render: (_: any, r: any) => (
        <Button danger size="small" type="link" onClick={() => onRevoke(r.boostPackId)}>
          撤销
        </Button>
      ),
      title: '操作',
    },
  ];

  return (
    <Flexbox gap={16} padding={32}>
      <Flexbox horizontal align="center" justify="space-between">
        <h2 style={{ margin: 0 }}>加油包</h2>
        <Button type="primary" onClick={() => setCreating(true)}>
          发放加油包
        </Button>
      </Flexbox>

      <Table columns={columns} dataSource={data ?? []} loading={isLoading} rowKey="boostPackId" />

      <Modal
        open={creating}
        title="发放加油包"
        width={560}
        onCancel={() => setCreating(false)}
        onOk={onGrant}
      >
        <Radio.Group
          buttonStyle="solid"
          optionType="button"
          style={{ marginBottom: 16 }}
          value={mode}
          onChange={(e) => setMode(e.target.value)}
        >
          <Radio.Button value="template">按模板发放（推荐）</Radio.Button>
          <Radio.Button value="custom">手动指定单模型</Radio.Button>
        </Radio.Group>

        <Form form={form} layout="vertical">
          <Form.Item label="用户" name="userId" rules={[{ required: true }]}>
            <Select
              showSearch
              filterOption={(input, option) =>
                String(option?.label ?? '')
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
              options={(users ?? []).map((u: any) => ({
                label: `${u.email ?? u.username ?? u.userId}`,
                value: u.userId,
              }))}
            />
          </Form.Item>

          {mode === 'template' ? (
            <>
              <Form.Item label="加油包模板" name="templateId" rules={[{ required: true }]}>
                <Select
                  options={(templates ?? [])
                    .filter((t: any) => t.enabled !== false)
                    .map((t: any) => ({
                      label: `${t.name}（${t.models?.length ?? 0} 个模型共享 · 每单位 ${t.quotaPerUnit} 次）`,
                      value: t.id,
                    }))}
                  placeholder={
                    (templates?.length ?? 0) === 0
                      ? '尚未配置模板，请先去"加油包管理"创建'
                      : '选择模板'
                  }
                />
              </Form.Item>
              <Form.Item
                label="购买单位数量 (×quotaPerUnit 才是实际次数)"
                name="quantity"
                rules={[{ required: true, type: 'number', min: 1 }]}
              >
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </>
          ) : (
            <>
              <Form.Item label="服务商" name="providerId" rules={[{ required: true }]}>
                <Input placeholder="e.g. openai" />
              </Form.Item>
              <Form.Item label="模型" name="modelId" rules={[{ required: true }]}>
                <Input placeholder="e.g. gpt-4o" />
              </Form.Item>
              <Form.Item
                label="次数"
                name="remainingCount"
                rules={[{ required: true, type: 'number', min: 1 }]}
              >
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </>
          )}

          <Form.Item label="到期时间" name="expireAt">
            <DatePicker showTime style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="备注 (原因)" name="grantedReason">
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </Flexbox>
  );
});

export default BoostPacksPage;
