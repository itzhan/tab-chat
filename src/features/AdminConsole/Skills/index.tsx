'use client';

import { builtinSkills } from '@lobechat/builtin-skills';
import { builtinTools } from '@lobechat/builtin-tools';
import { Flexbox } from '@lobehub/ui';
import { Alert, Button, Divider, Empty, Input, message, Modal, Switch, Tabs } from 'antd';
import { Settings2 } from 'lucide-react';
import { memo, useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';

import { adminService } from '@/services/admin';

import GlobalPluginManager from './GlobalPluginManager';

interface SkillRow {
  description?: string;
  id: string;
  source: 'tool' | 'skill';
  title: string;
}

type Overrides = Record<string, { title?: string; description?: string }>;

const SkillsAdmin = memo(() => {
  const { data, mutate, isLoading } = useSWR('admin.skills.allowlist', () =>
    adminService.getBuiltinSkillAllowlist(),
  );
  const { data: overridesData, mutate: refetchOverrides } = useSWR('admin.skills.overrides', () =>
    adminService.getBuiltinSkillOverrides(),
  );
  const overrides: Overrides = (overridesData ?? {}) as Overrides;

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editing, setEditing] = useState<SkillRow | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [savingOverride, setSavingOverride] = useState(false);

  const openEdit = (row: SkillRow) => {
    setEditing(row);
    setEditTitle(overrides[row.id]?.title ?? '');
    setEditDesc(overrides[row.id]?.description ?? '');
  };

  const saveOverride = async () => {
    if (!editing) return;
    setSavingOverride(true);
    try {
      const next: Overrides = { ...overrides };
      if (!editTitle && !editDesc) {
        delete next[editing.id];
      } else {
        next[editing.id] = {
          title: editTitle || undefined,
          description: editDesc || undefined,
        };
      }
      await adminService.setBuiltinSkillOverrides(next);
      await refetchOverrides();
      message.success('已保存');
      setEditing(null);
    } catch (err: any) {
      message.error(err.message ?? '保存失败');
    } finally {
      setSavingOverride(false);
    }
  };

  const allSkills = useMemo<SkillRow[]>(() => {
    const tools: SkillRow[] = builtinTools
      .filter((t: any) => !t.hidden)
      .map((t: any) => ({
        description: t.manifest?.meta?.description ?? '',
        id: t.identifier,
        source: 'tool',
        title: t.manifest?.meta?.title ?? t.identifier,
      }));
    const skills: SkillRow[] = builtinSkills.map((s: any) => ({
      description: s.description ?? '',
      id: s.identifier,
      source: 'skill',
      title: s.name ?? s.identifier,
    }));
    return [...skills, ...tools];
  }, []);

  // Default behaviour: if allowlist is null (never set), treat as "all allowed" in the UI.
  useEffect(() => {
    if (data === undefined) return;
    if (data === null) {
      setSelected(new Set(allSkills.map((s) => s.id)));
    } else {
      setSelected(new Set(data));
    }
    setDirty(false);
  }, [data, allSkills]);

  const toggle = (id: string, on: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
    setDirty(true);
  };

  const onSelectAll = () => {
    setSelected(new Set(allSkills.map((s) => s.id)));
    setDirty(true);
  };

  const onClearAll = () => {
    setSelected(new Set());
    setDirty(true);
  };

  const onSave = async () => {
    setSaving(true);
    try {
      await adminService.setBuiltinSkillAllowlist([...selected]);
      message.success('已保存。普通用户刷新页面后生效。');
      mutate();
      setDirty(false);
    } catch (err: any) {
      message.error(err.message ?? '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const builtinTabContent = (
    <Flexbox gap={16}>
      <Alert
        showIcon
        description="控制普通用户在对话框和「设置 → 技能」页面能看到的内置技能。此列表不影响管理员自己。未保存前不会生效。"
        message="内置技能开关"
        type="info"
      />

      <Flexbox horizontal gap={8}>
        <Button size="small" onClick={onSelectAll}>
          全部开启
        </Button>
        <Button size="small" onClick={onClearAll}>
          全部关闭
        </Button>
        <div style={{ flex: 1 }} />
        <Button disabled={!dirty} loading={saving} type="primary" onClick={onSave}>
          保存配置
        </Button>
      </Flexbox>

      {isLoading && <div>加载中...</div>}
      {!isLoading && allSkills.length === 0 && <Empty description="未检测到任何内置技能" />}
      {!isLoading && allSkills.length > 0 && (
        <Flexbox gap={8}>
          <Divider style={{ marginBlock: 4 }} titlePlacement="start">
            内置 Agent Skills ({allSkills.filter((s) => s.source === 'skill').length})
          </Divider>
          {allSkills
            .filter((s) => s.source === 'skill')
            .map((item) => (
              <Flexbox
                horizontal
                align="center"
                gap={12}
                justify="space-between"
                key={item.id}
                padding={12}
                style={{
                  background: 'var(--lobe-color-bg-container, #fff)',
                  border: '1px solid var(--lobe-color-border-secondary, #eee)',
                  borderRadius: 8,
                }}
              >
                <Flexbox flex={1} gap={2}>
                  <div style={{ fontWeight: 500 }}>
                    {overrides[item.id]?.title ?? item.title}
                    {overrides[item.id]?.title && (
                      <span style={{ color: '#888', fontSize: 11, marginLeft: 6 }}>
                        （原：{item.title}）
                      </span>
                    )}
                  </div>
                  <div style={{ color: '#888', fontSize: 12 }}>{item.id}</div>
                  {(overrides[item.id]?.description ?? item.description) && (
                    <div style={{ color: '#666', fontSize: 12 }}>
                      {overrides[item.id]?.description ?? item.description}
                    </div>
                  )}
                </Flexbox>
                <Flexbox horizontal align="center" gap={8}>
                  <Button
                    icon={<Settings2 size={14} />}
                    size="small"
                    onClick={() => openEdit(item)}
                  >
                    编辑
                  </Button>
                  <Switch
                    checked={selected.has(item.id)}
                    onChange={(checked) => toggle(item.id, checked)}
                  />
                </Flexbox>
              </Flexbox>
            ))}

          <Divider style={{ marginBlock: 12 }} titlePlacement="start">
            内置 Tools ({allSkills.filter((s) => s.source === 'tool').length})
          </Divider>
          {allSkills
            .filter((s) => s.source === 'tool')
            .map((item) => (
              <Flexbox
                horizontal
                align="center"
                gap={12}
                justify="space-between"
                key={item.id}
                padding={12}
                style={{
                  background: 'var(--lobe-color-bg-container, #fff)',
                  border: '1px solid var(--lobe-color-border-secondary, #eee)',
                  borderRadius: 8,
                }}
              >
                <Flexbox flex={1} gap={2}>
                  <div style={{ fontWeight: 500 }}>
                    {overrides[item.id]?.title ?? item.title}
                    {overrides[item.id]?.title && (
                      <span style={{ color: '#888', fontSize: 11, marginLeft: 6 }}>
                        （原：{item.title}）
                      </span>
                    )}
                  </div>
                  <div style={{ color: '#888', fontSize: 12 }}>{item.id}</div>
                  {(overrides[item.id]?.description ?? item.description) && (
                    <div style={{ color: '#666', fontSize: 12 }}>
                      {overrides[item.id]?.description ?? item.description}
                    </div>
                  )}
                </Flexbox>
                <Flexbox horizontal align="center" gap={8}>
                  <Button
                    icon={<Settings2 size={14} />}
                    size="small"
                    onClick={() => openEdit(item)}
                  >
                    编辑
                  </Button>
                  <Switch
                    checked={selected.has(item.id)}
                    onChange={(checked) => toggle(item.id, checked)}
                  />
                </Flexbox>
              </Flexbox>
            ))}
        </Flexbox>
      )}
    </Flexbox>
  );

  return (
    <Flexbox gap={16} padding={32}>
      <h2 style={{ margin: 0 }}>技能开放管理</h2>
      <Tabs
        items={[
          { children: builtinTabContent, key: 'builtin', label: '内置技能' },
          { children: <GlobalPluginManager />, key: 'global', label: '全局插件（市场）' },
        ]}
      />

      <Modal
        confirmLoading={savingOverride}
        open={!!editing}
        title={`编辑「${editing?.title ?? ''}」显示信息`}
        onCancel={() => setEditing(null)}
        onOk={saveOverride}
      >
        <Flexbox gap={12}>
          <Alert
            showIcon
            message="留空字段则保留原始值。用户看到的将是你这里设置的名称/描述。"
            type="info"
          />
          <div>
            <div style={{ marginBottom: 4, fontSize: 13 }}>显示标题</div>
            <Input
              placeholder={editing?.title ?? ''}
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
            />
          </div>
          <div>
            <div style={{ marginBottom: 4, fontSize: 13 }}>显示描述</div>
            <Input.TextArea
              placeholder={editing?.description ?? ''}
              rows={4}
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
            />
          </div>
        </Flexbox>
      </Modal>
    </Flexbox>
  );
});

SkillsAdmin.displayName = 'SkillsAdmin';

export default SkillsAdmin;
