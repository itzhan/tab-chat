'use client';

import { Flexbox } from '@lobehub/ui';
import { Button, Form, Input, InputNumber, message, Modal, Switch, Table } from 'antd';
import { memo, useState } from 'react';
import useSWR from 'swr';

import { adminService } from '@/services/admin';

import ModelQuotaEditor from './ModelQuotaEditor';

const PlansPage = memo(() => {
  const { data, isLoading, mutate } = useSWR('admin.plans', () => adminService.listPlans());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [quotaPlanId, setQuotaPlanId] = useState<string | null>(null);
  const [form] = Form.useForm();

  const openCreate = () => {
    setEditingId('__new__');
    form.resetFields();
    form.setFieldsValue({ enabled: true, storageQuotaBytes: 104857600, sortOrder: 0 });
  };

  const openEdit = (record: any) => {
    setEditingId(record.id);
    form.setFieldsValue(record);
  };

  const onSubmit = async () => {
    const values = await form.validateFields();
    try {
      if (editingId === '__new__') {
        await adminService.createPlan(values);
      } else {
        await adminService.updatePlan({ ...values, id: editingId! });
      }
      message.success('保存成功');
      setEditingId(null);
      mutate();
    } catch (err: any) {
      message.error(err.message ?? '保存失败');
    }
  };

  const onDelete = async (id: string) => {
    Modal.confirm({
      title: '确认删除？',
      content: `套餐 ${id} 及其模型额度配置将被删除`,
      onOk: async () => {
        await adminService.deletePlan(id);
        message.success('已删除');
        mutate();
      },
    });
  };

  const columns = [
    { dataIndex: 'id', key: 'id', title: 'ID', width: 140 },
    { dataIndex: 'name', key: 'name', title: '名称' },
    { dataIndex: 'description', key: 'description', title: '描述' },
    {
      dataIndex: 'storageQuotaBytes',
      key: 'storageQuotaBytes',
      render: (b: number) => (b === 0 ? '不限' : `${(b / 1024 / 1024).toFixed(0)} MB`),
      title: '知识库容量',
    },
    {
      dataIndex: 'isDefault',
      key: 'isDefault',
      render: (v: boolean) => (v ? '✓' : ''),
      title: '默认',
      width: 60,
    },
    {
      dataIndex: 'enabled',
      key: 'enabled',
      render: (v: boolean) => (v ? '✓' : '✗'),
      title: '启用',
      width: 60,
    },
    {
      key: 'actions',
      render: (_: any, r: any) => (
        <Flexbox horizontal gap={8}>
          <Button size="small" type="link" onClick={() => openEdit(r)}>
            编辑
          </Button>
          <Button size="small" type="link" onClick={() => setQuotaPlanId(r.id)}>
            模型额度
          </Button>
          <Button danger size="small" type="link" onClick={() => onDelete(r.id)}>
            删除
          </Button>
        </Flexbox>
      ),
      title: '操作',
    },
  ];

  return (
    <Flexbox gap={16} padding={32}>
      <Flexbox horizontal align="center" justify="space-between">
        <h2 style={{ margin: 0 }}>套餐管理</h2>
        <Button type="primary" onClick={openCreate}>
          新建套餐
        </Button>
      </Flexbox>

      <Table
        columns={columns}
        dataSource={data ?? []}
        loading={isLoading}
        pagination={false}
        rowKey="id"
      />

      <Modal
        open={!!editingId}
        title={editingId === '__new__' ? '新建套餐' : '编辑套餐'}
        onCancel={() => setEditingId(null)}
        onOk={onSubmit}
      >
        <Form form={form} layout="vertical">
          <Form.Item label="ID (唯一标识)" name="id" rules={[{ required: true }]}>
            <Input disabled={editingId !== '__new__'} />
          </Form.Item>
          <Form.Item label="名称" name="name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="描述" name="description">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item extra="0 = 不限制" label="知识库容量 (字节)" name="storageQuotaBytes">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="默认套餐 (新用户自动使用)" name="isDefault" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item label="启用" name="enabled" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item label="排序 (数字越小越靠前)" name="sortOrder">
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      {quotaPlanId && (
        <ModelQuotaEditor planId={quotaPlanId} onClose={() => setQuotaPlanId(null)} />
      )}
    </Flexbox>
  );
});

export default PlansPage;
