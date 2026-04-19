'use client';

import { Flexbox } from '@lobehub/ui';
import { Button, message, Table } from 'antd';
import { memo, useMemo } from 'react';
import useSWR from 'swr';

import { adminService } from '@/services/admin';

const AdminsPage = memo(() => {
  const { data, isLoading, mutate } = useSWR('admin.users', () => adminService.listUsers());

  const admins = useMemo(() => (data ?? []).filter((u: any) => u.role === 'admin'), [data]);

  const demote = async (userId: string) => {
    await adminService.setRole({ role: 'user', userId });
    message.success('已降级');
    mutate();
  };

  return (
    <Flexbox gap={16} padding={32}>
      <h2 style={{ margin: 0 }}>管理员列表</h2>
      <p style={{ color: '#888' }}>
        在「用户管理」页面点击「设为 Admin」可新增管理员。此处展示所有当前管理员。
      </p>

      <Table
        dataSource={admins}
        loading={isLoading}
        rowKey="userId"
        columns={[
          { dataIndex: 'email', title: '邮箱' },
          { dataIndex: 'username', title: '用户名' },
          { dataIndex: 'userId', title: 'User ID' },
          {
            render: (_: any, r: any) => (
              <Button danger size="small" type="link" onClick={() => demote(r.userId)}>
                降级为普通用户
              </Button>
            ),
            title: '操作',
          },
        ]}
      />
    </Flexbox>
  );
});

export default AdminsPage;
