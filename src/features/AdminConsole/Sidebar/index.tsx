'use client';

import { Flexbox } from '@lobehub/ui';
import { Alert, Button, Checkbox, Divider, message, Switch } from 'antd';
import { memo, useEffect, useState } from 'react';
import useSWR from 'swr';

import { adminService } from '@/services/admin';

const AVAILABLE_ITEMS: { id: string; label: string; description?: string }[] = [
  { id: 'agent', label: '助手 / Agent', description: '始终可见，不可关闭' },
  { id: 'pages', label: '文稿 / Pages' },
  { id: 'recents', label: '最近' },
  { id: 'community', label: '社区 / Community' },
  { id: 'resource', label: '资料 / 知识库' },
  { id: 'memory', label: '记忆 / Memory' },
];

const SidebarAdmin = memo(() => {
  const { data, mutate, isLoading } = useSWR('admin.sidebar', () =>
    adminService.getSidebarAllowlist(),
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) setSelected(new Set(data));
  }, [data]);

  const toggle = (id: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      // agent is always on
      next.add('agent');
      return next;
    });
  };

  const onSave = async () => {
    setSaving(true);
    try {
      const items = [...selected];
      if (!items.includes('agent')) items.push('agent');
      await adminService.setSidebarAllowlist(items);
      message.success('已保存。非管理员用户刷新页面后生效。');
      mutate();
    } catch (err: any) {
      message.error(err.message ?? '保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Flexbox gap={16} padding={32}>
      <h2 style={{ margin: 0 }}>侧栏菜单配置</h2>

      <Alert
        showIcon
        description="配置普通用户左侧菜单能看到哪些入口。管理员自己始终能看到所有菜单。用户仍可以在他们侧的「自定义侧栏」里在允许范围内进一步隐藏。"
        message="说明"
        type="info"
      />

      <Divider style={{ marginBlock: 8 }} titlePlacement="start">
        用户可见项
      </Divider>

      {isLoading && <div>加载中...</div>}
      {!isLoading && (
        <Flexbox gap={12}>
          {AVAILABLE_ITEMS.map((item) => (
            <Checkbox
              checked={selected.has(item.id)}
              disabled={item.id === 'agent'}
              key={item.id}
              onChange={(e) => toggle(item.id, e.target.checked)}
            >
              <Flexbox gap={4}>
                <span>{item.label}</span>
                {item.description && (
                  <span style={{ color: '#888', fontSize: 12 }}>{item.description}</span>
                )}
              </Flexbox>
            </Checkbox>
          ))}
        </Flexbox>
      )}

      <Flexbox horizontal justify="flex-end" style={{ marginTop: 16 }}>
        <Button loading={saving} type="primary" onClick={onSave}>
          保存配置
        </Button>
      </Flexbox>

      <Divider style={{ marginBlock: 24 }} titlePlacement="start">
        客户端请求模式
      </Divider>

      <ClientFetchToggle />
    </Flexbox>
  );
});

const ClientFetchToggle = memo(() => {
  const { data, mutate } = useSWR('admin.clientFetch', () =>
    adminService.getAllowUsersClientFetch(),
  );
  const [saving, setSaving] = useState(false);

  const onToggle = async (checked: boolean) => {
    setSaving(true);
    try {
      await adminService.setAllowUsersClientFetch(checked);
      message.success(checked ? '已允许普通用户客户端直连' : '已禁止用户客户端直连');
      mutate();
    } catch (err: any) {
      message.error(err.message ?? '保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Flexbox gap={12}>
      <Alert
        showIcon
        message="⚠️ 安全提醒"
        type="warning"
        description={
          <div>
            开启后，普通用户聊天请求也会从 <b>浏览器直连</b> AI 供应商（跳过服务器中转）。 此时{' '}
            <b>管理员的 API Key 会下发到浏览器</b>，用户可以在 Network 面板里看到明文。
            <br />
            仅在以下情况开启：(1) 服务器无法直接访问 AI 供应商（代理/防火墙限制）， (2)
            你信任所有用户。配额仍会服务端校验，不影响计费。
          </div>
        }
      />
      <Flexbox horizontal align="center" gap={12}>
        <Switch checked={data === true} disabled={saving} loading={saving} onChange={onToggle} />
        <span>允许普通用户使用客户端请求模式</span>
      </Flexbox>
    </Flexbox>
  );
});

export default SidebarAdmin;
