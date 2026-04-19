'use client';

import { Flexbox } from '@lobehub/ui';
import { Button, DatePicker, Form, message, Modal, Select, Table, Tag } from 'antd';
import dayjs from 'dayjs';
import { memo, useState } from 'react';
import useSWR from 'swr';

import { adminService } from '@/services/admin';

const UsersPage = memo(() => {
  const { data: users, isLoading, mutate } = useSWR('admin.users', () => adminService.listUsers());
  const { data: plans } = useSWR('admin.plans.forSelect', () => adminService.listPlans());

  const [editing, setEditing] = useState<any | null>(null);
  const [form] = Form.useForm();

  const openEdit = (user: any) => {
    setEditing(user);
    form.setFieldsValue({
      expireAt: user.expireAt ? dayjs(user.expireAt) : null,
      planId: user.planId ?? plans?.find((p: any) => p.isDefault)?.id ?? 'free',
    });
  };

  const onSave = async () => {
    const values = await form.validateFields();
    await adminService.updateSubscription({
      expireAt: values.expireAt ? values.expireAt.toISOString() : null,
      planId: values.planId,
      userId: editing.userId,
    });
    message.success('已更新订阅');
    setEditing(null);
    mutate();
  };

  const makeAdmin = async (user: any) => {
    await adminService.setRole({ role: 'admin', userId: user.userId });
    message.success('已设为管理员');
    mutate();
  };

  const columns = [
    { dataIndex: 'email', key: 'email', title: '邮箱' },
    { dataIndex: 'username', key: 'username', title: '用户名' },
    { dataIndex: 'planId', key: 'planId', title: '套餐' },
    {
      dataIndex: 'expireAt',
      key: 'expireAt',
      render: (v: string | null) => (v ? dayjs(v).format('YYYY-MM-DD') : '永久'),
      title: '到期',
    },
    {
      dataIndex: 'status',
      key: 'status',
      render: (v: string) =>
        v === 'active' ? <Tag color="green">active</Tag> : <Tag>{v ?? '-'}</Tag>,
      title: '状态',
    },
    {
      key: 'actions',
      render: (_: any, r: any) => (
        <Flexbox horizontal gap={4}>
          <Button size="small" type="link" onClick={() => openEdit(r)}>
            改套餐
          </Button>
          <Button size="small" type="link" onClick={() => makeAdmin(r)}>
            设为 Admin
          </Button>
        </Flexbox>
      ),
      title: '操作',
    },
  ];

  return (
    <Flexbox gap={16} padding={32}>
      <h2 style={{ margin: 0 }}>用户管理</h2>
      <Table columns={columns} dataSource={users ?? []} loading={isLoading} rowKey="userId" />

      <Modal
        open={!!editing}
        title={`编辑订阅: ${editing?.email ?? ''}`}
        onCancel={() => setEditing(null)}
        onOk={onSave}
      >
        <Form form={form} layout="vertical">
          <Form.Item label="套餐" name="planId" rules={[{ required: true }]}>
            <Select options={(plans ?? []).map((p: any) => ({ label: p.name, value: p.id }))} />
          </Form.Item>
          <Form.Item extra="留空 = 永久" label="到期时间" name="expireAt">
            <DatePicker showTime style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </Flexbox>
  );
});

export default UsersPage;
