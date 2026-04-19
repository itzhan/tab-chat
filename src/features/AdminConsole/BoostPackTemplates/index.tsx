'use client';

import { Flexbox } from '@lobehub/ui';
import {
  Alert,
  Button,
  Divider,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Space,
  Switch,
  Table,
  Tag,
} from 'antd';
import { Plus, Trash2 } from 'lucide-react';
import { customAlphabet } from 'nanoid/non-secure';
import { memo, useState } from 'react';
import useSWR from 'swr';

import { adminService } from '@/services/admin';

import ModelMultiPicker from './ModelMultiPicker';

const newId = () => customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 8)();

type Tier = { quantity: number; price: number; label?: string };

type Template = {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  sortOrder: number;
  models: Array<{ providerId: string; modelId: string }>;
  quotaPerUnit: number;
  pricingTiers: Tier[];
};

const BoostPackTemplatesAdmin = memo(() => {
  const { data, mutate, isLoading } = useSWR('admin.boostPackTemplates', () =>
    adminService.getBoostPackTemplates(),
  );
  const templates = (data ?? []) as Template[];

  const [editing, setEditing] = useState<Template | null>(null);
  const [saving, setSaving] = useState(false);

  const openCreate = () => {
    setEditing({
      id: '',
      name: '',
      description: '',
      enabled: true,
      sortOrder: 0,
      models: [],
      quotaPerUnit: 100,
      pricingTiers: [{ quantity: 1, price: 10 }],
    });
  };

  const openEdit = (t: Template) =>
    setEditing({
      ...t,
      models: t.models ?? [],
      pricingTiers: t.pricingTiers ?? [],
    });

  const close = () => setEditing(null);

  const save = async () => {
    if (!editing) return;
    if (!editing.name.trim()) {
      message.warning('请填写名称');
      return;
    }
    if (editing.models.length === 0) {
      message.warning('至少选择一个模型');
      return;
    }
    if (editing.pricingTiers.length === 0) {
      message.warning('至少配置一个价格档位');
      return;
    }
    setSaving(true);
    try {
      const sanitized: Template = {
        ...editing,
        id: editing.id || newId(),
      };
      const exists = templates.some((t) => t.id === sanitized.id);
      const next = exists
        ? templates.map((t) => (t.id === sanitized.id ? sanitized : t))
        : [...templates, sanitized];
      await adminService.setBoostPackTemplates(next);
      message.success('已保存');
      await mutate();
      setEditing(null);
    } catch (err: any) {
      message.error(err.message ?? '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    Modal.confirm({
      title: '确认删除该加油包？',
      onOk: async () => {
        const next = templates.filter((t) => t.id !== id);
        await adminService.setBoostPackTemplates(next);
        message.success('已删除');
        mutate();
      },
    });
  };

  const columns = [
    { dataIndex: 'name', title: '名称' },
    {
      key: 'models',
      render: (_: any, t: Template) => <Tag>{t.models?.length ?? 0} 个模型共享</Tag>,
      title: '覆盖模型',
    },
    {
      dataIndex: 'quotaPerUnit',
      render: (v: number) => `${v} 次/单位`,
      title: '单位额度',
    },
    {
      key: 'tiers',
      render: (_: any, t: Template) => (
        <Space wrap size={4}>
          {(t.pricingTiers ?? []).map((tier, i) => (
            <Tag color="blue" key={i}>
              {tier.quantity}×→¥{tier.price}
            </Tag>
          ))}
        </Space>
      ),
      title: '价格档位',
    },
    {
      dataIndex: 'enabled',
      render: (v: boolean) => (v ? <Tag color="green">启用</Tag> : <Tag>停用</Tag>),
      title: '状态',
      width: 80,
    },
    { dataIndex: 'sortOrder', title: '排序', width: 60 },
    {
      key: 'actions',
      render: (_: any, t: Template) => (
        <Space>
          <Button size="small" type="link" onClick={() => openEdit(t)}>
            编辑
          </Button>
          <Button danger size="small" type="link" onClick={() => remove(t.id)}>
            删除
          </Button>
        </Space>
      ),
      title: '操作',
      width: 140,
    },
  ];

  return (
    <Flexbox gap={16} padding={32}>
      <Flexbox horizontal align="center" justify="space-between">
        <h2 style={{ margin: 0 }}>加油包管理</h2>
        <Button icon={<Plus size={14} />} type="primary" onClick={openCreate}>
          新建加油包
        </Button>
      </Flexbox>

      <Alert
        showIcon
        description="每次购买一个「单位」，获得 quotaPerUnit 条消息，这个额度在配置的模型之间共享。设置多档价格让客户买得越多越便宜。"
        message="加油包 = 一组模型共享一个次数池"
        type="info"
      />

      <Table
        columns={columns as any}
        dataSource={templates}
        loading={isLoading}
        pagination={false}
        rowKey="id"
      />

      {editing && (
        <EditorModal
          saving={saving}
          setTemplate={setEditing}
          template={editing}
          onClose={close}
          onSave={save}
        />
      )}
    </Flexbox>
  );
});

interface EditorProps {
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
  setTemplate: (t: Template) => void;
  template: Template;
}

const EditorModal = memo<EditorProps>(({ template, setTemplate, onSave, onClose, saving }) => {
  const t = template;
  const set = (patch: Partial<Template>) => setTemplate({ ...t, ...patch });

  const updateTier = (i: number, patch: Partial<Tier>) => {
    const tiers = t.pricingTiers.slice();
    tiers[i] = { ...tiers[i], ...patch };
    set({ pricingTiers: tiers });
  };
  const removeTier = (i: number) =>
    set({ pricingTiers: t.pricingTiers.filter((_, idx) => idx !== i) });
  const addTier = () =>
    set({
      pricingTiers: [...t.pricingTiers, { quantity: 10, price: 80, label: '' }],
    });

  return (
    <Modal
      open
      confirmLoading={saving}
      okText="保存"
      title={t.id ? `编辑：${t.name || t.id}` : '新建加油包'}
      width={820}
      onCancel={onClose}
      onOk={onSave}
    >
      <Form layout="vertical">
        <Form.Item required label="名称">
          <Input
            placeholder="例如：GPT-5 系列 100 次包"
            value={t.name}
            onChange={(e) => set({ name: e.target.value })}
          />
        </Form.Item>
        <Form.Item label="描述">
          <Input.TextArea
            placeholder="给用户看的说明文案"
            rows={2}
            value={t.description ?? ''}
            onChange={(e) => set({ description: e.target.value })}
          />
        </Form.Item>

        <Flexbox horizontal gap={12}>
          <Form.Item label="每单位消息数" style={{ flex: 1 }}>
            <InputNumber
              min={1}
              style={{ width: '100%' }}
              value={t.quotaPerUnit}
              onChange={(v) => set({ quotaPerUnit: Number(v ?? 1) })}
            />
          </Form.Item>
          <Form.Item label="排序" style={{ width: 120 }}>
            <InputNumber
              style={{ width: '100%' }}
              value={t.sortOrder}
              onChange={(v) => set({ sortOrder: Number(v ?? 0) })}
            />
          </Form.Item>
          <Form.Item label="启用" style={{ width: 120 }}>
            <Switch checked={t.enabled} onChange={(v) => set({ enabled: v })} />
          </Form.Item>
        </Flexbox>

        <Divider titlePlacement="start">价格档位（批量折扣）</Divider>
        <Flexbox gap={8}>
          {t.pricingTiers.map((tier, i) => (
            <Flexbox horizontal align="center" gap={8} key={i}>
              <span style={{ width: 64 }}>购买</span>
              <InputNumber
                min={1}
                placeholder="数量"
                style={{ width: 100 }}
                value={tier.quantity}
                onChange={(v) => updateTier(i, { quantity: Number(v ?? 1) })}
              />
              <span>×</span>
              <span>总价 ¥</span>
              <InputNumber
                min={0}
                placeholder="价格"
                step={0.01}
                style={{ width: 120 }}
                value={tier.price}
                onChange={(v) => updateTier(i, { price: Number(v ?? 0) })}
              />
              <Input
                placeholder="标签（可选，例如「推荐」）"
                style={{ width: 200 }}
                value={tier.label ?? ''}
                onChange={(e) => updateTier(i, { label: e.target.value })}
              />
              <span style={{ color: '#888', fontSize: 12 }}>
                （共 {tier.quantity * t.quotaPerUnit} 条）
              </span>
              <Button
                danger
                icon={<Trash2 size={12} />}
                size="small"
                onClick={() => removeTier(i)}
              />
            </Flexbox>
          ))}
          <Button icon={<Plus size={14} />} onClick={addTier}>
            添加价格档位
          </Button>
        </Flexbox>

        <Divider titlePlacement="start">
          共享额度的模型 <Tag>{t.models.length} 个已选</Tag>
        </Divider>
        <ModelMultiPicker value={t.models} onChange={(next) => set({ models: next })} />
      </Form>
    </Modal>
  );
});

BoostPackTemplatesAdmin.displayName = 'BoostPackTemplatesAdmin';
EditorModal.displayName = 'BoostPackTemplateEditor';

export default BoostPackTemplatesAdmin;
