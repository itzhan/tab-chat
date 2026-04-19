'use client';

import { Flexbox } from '@lobehub/ui';
import { Alert, Button, Empty, Input, List, message, Modal, Spin, Tag } from 'antd';
import { createStyles } from 'antd-style';
import { ExternalLink, Plus, Search, Settings2, Trash2 } from 'lucide-react';
import { memo, useMemo, useState } from 'react';
import useSWR from 'swr';

import { adminService } from '@/services/admin';
import { discoverService } from '@/services/discover';

const MARKET_BASE = 'https://lobechat.com';
const MARKET_URLS = {
  mcp: `${MARKET_BASE}/mcp`,
  skill: `${MARKET_BASE}/skill`,
};

type GlobalPlugin = {
  displayDescription?: string;
  displayTitle?: string;
  identifier: string;
  manifest?: any;
  type: 'mcp' | 'skill';
};

const useStyles = createStyles(({ css, token }) => ({
  card: css`
    padding: 16px;
    border: 1px solid ${token.colorBorderSecondary};
    border-radius: 8px;
    background: ${token.colorBgContainer};
  `,
  result: css`
    padding-block: 10px;
    padding-inline: 12px;
    border: 1px solid ${token.colorBorderSecondary};
    border-radius: 6px;

    background: ${token.colorBgElevated};

    &:hover {
      border-color: ${token.colorPrimary};
    }
  `,
}));

const GlobalPluginManager = memo(() => {
  const { styles } = useStyles();
  const [keyword, setKeyword] = useState('');
  const [searchType, setSearchType] = useState<'mcp' | 'skill'>('mcp');
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<GlobalPlugin | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');

  const { data: list, mutate: refetchList } = useSWR('admin.globalPlugins', () =>
    adminService.getGlobalPluginList(),
  );

  const typedList = (list ?? []) as GlobalPlugin[];

  // Always load recommended list by default; update when keyword changes
  const {
    data: searchResult,
    isLoading: searching,
    error: searchError,
  } = useSWR(['admin.globalPlugins.search', keyword, searchType], async () => {
    if (searchType === 'mcp') {
      return discoverService.getMcpList({ q: keyword || undefined, pageSize: 20 });
    }
    return discoverService.getSkillList({ q: keyword || undefined, pageSize: 20 });
  });

  const existingIds = useMemo(
    () => new Set(typedList.map((p) => `${p.type}:${p.identifier}`)),
    [typedList],
  );

  const saveList = async (next: GlobalPlugin[]) => {
    setSaving(true);
    try {
      await adminService.setGlobalPluginList(next);
      await refetchList();
    } catch (err: any) {
      message.error(err.message ?? '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const onAdd = async (
    identifier: string,
    type: 'mcp' | 'skill',
    title?: string,
    description?: string,
  ) => {
    if (existingIds.has(`${type}:${identifier}`)) {
      message.info('已添加过');
      return;
    }
    // Fetch manifest at add-time so runtime invocation works without extra network calls
    let manifest: any = undefined;
    try {
      if (type === 'mcp') {
        manifest = await discoverService.getMcpManifest({ identifier });
      } else {
        // Skills often already ship with full manifest in list item; fall back to list entry.
        manifest = { identifier, type };
      }
    } catch (err) {
      console.warn('Failed to fetch manifest for', identifier, err);
    }
    const next = [
      ...typedList,
      { displayDescription: description, displayTitle: title, identifier, manifest, type },
    ];
    await saveList(next);
    message.success('已添加');
  };

  const onRemove = async (item: GlobalPlugin) => {
    const next = typedList.filter(
      (p) => !(p.identifier === item.identifier && p.type === item.type),
    );
    await saveList(next);
    message.success('已移除');
  };

  const onEdit = (item: GlobalPlugin) => {
    setEditing(item);
    setEditTitle(item.displayTitle ?? '');
    setEditDesc(item.displayDescription ?? '');
  };

  const onConfirmEdit = async () => {
    if (!editing) return;
    const next = typedList.map((p) =>
      p.identifier === editing.identifier && p.type === editing.type
        ? { ...p, displayDescription: editDesc || undefined, displayTitle: editTitle || undefined }
        : p,
    );
    await saveList(next);
    setEditing(null);
    message.success('已更新');
  };

  return (
    <Flexbox gap={16}>
      <Alert
        showIcon
        description="搜索 MCP 服务 / 市场技能，将它们加入全局列表后，所有用户在对话框技能菜单中都能直接使用。你可以为每个技能重新命名/添加自定义描述，方便用户理解。"
        message="全局插件（市场来源）"
        type="info"
      />

      <div className={styles.card}>
        <Flexbox gap={12}>
          <Flexbox horizontal gap={8}>
            <Button.Group>
              <Button
                type={searchType === 'mcp' ? 'primary' : 'default'}
                onClick={() => setSearchType('mcp')}
              >
                MCP 服务
              </Button>
              <Button
                type={searchType === 'skill' ? 'primary' : 'default'}
                onClick={() => setSearchType('skill')}
              >
                市场技能
              </Button>
            </Button.Group>
            <Input
              allowClear
              placeholder={searchType === 'mcp' ? '搜索 MCP 服务…' : '搜索市场技能…'}
              prefix={<Search size={14} />}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
            <Button
              href={MARKET_URLS[searchType]}
              icon={<ExternalLink size={14} />}
              target="_blank"
            >
              打开官方市场
            </Button>
          </Flexbox>

          <Flexbox gap={6} style={{ maxHeight: 420, overflow: 'auto' }}>
            {searching && (
              <Flexbox align="center" justify="center" padding={24}>
                <Spin />
              </Flexbox>
            )}
            {searchError && (
              <Alert
                message="搜索失败"
                type="error"
                description={
                  <div>
                    无法访问官方市场（{String((searchError as Error)?.message ?? searchError)}）。
                    你仍然可以点上面的「打开官方市场」复制 identifier
                    后，手动使用下方的「直接添加」按钮。
                  </div>
                }
              />
            )}
            {!searching && !searchError && searchResult?.items?.length === 0 && (
              <Empty description="没有结果" />
            )}
            {!searching &&
              !searchError &&
              searchResult?.items?.map((item: any) => {
                const identifier = item.identifier;
                const isAdded = existingIds.has(`${searchType}:${identifier}`);
                return (
                  <Flexbox
                    horizontal
                    align="center"
                    className={styles.result}
                    gap={12}
                    justify="space-between"
                    key={identifier}
                  >
                    <Flexbox flex={1} gap={2}>
                      <div style={{ fontWeight: 500 }}>
                        {item.name ?? item.title ?? identifier}
                        <span style={{ color: '#888', fontSize: 11, marginLeft: 8 }}>
                          {identifier}
                        </span>
                      </div>
                      {item.description && (
                        <div style={{ color: '#666', fontSize: 12 }}>{item.description}</div>
                      )}
                    </Flexbox>
                    <Button
                      disabled={isAdded || saving}
                      icon={<Plus size={14} />}
                      size="small"
                      type={isAdded ? 'default' : 'primary'}
                      onClick={() =>
                        onAdd(identifier, searchType, item.name ?? item.title, item.description)
                      }
                    >
                      {isAdded ? '已添加' : '添加'}
                    </Button>
                  </Flexbox>
                );
              })}
          </Flexbox>

          <ManualAddRow
            disabled={saving}
            existingIds={existingIds}
            searchType={searchType}
            onAdd={onAdd}
          />
        </Flexbox>
      </div>

      <div className={styles.card}>
        <Flexbox gap={8}>
          <div style={{ fontWeight: 600 }}>已开放 {typedList.length} 项</div>
          {typedList.length === 0 && <Empty description="还没有加入任何全局插件" />}
          <List
            dataSource={typedList}
            renderItem={(item: GlobalPlugin) => (
              <List.Item
                actions={[
                  <Button
                    icon={<Settings2 size={14} />}
                    key="edit"
                    size="small"
                    onClick={() => onEdit(item)}
                  >
                    编辑标题/描述
                  </Button>,
                  <Button
                    danger
                    icon={<Trash2 size={14} />}
                    key="del"
                    size="small"
                    onClick={() => onRemove(item)}
                  >
                    移除
                  </Button>,
                ]}
              >
                <List.Item.Meta
                  description={item.displayDescription ?? '（未覆写描述）'}
                  title={
                    <Flexbox horizontal align="center" gap={8}>
                      <span>{item.displayTitle ?? item.identifier}</span>
                      <Tag color={item.type === 'mcp' ? 'purple' : 'cyan'}>
                        {item.type.toUpperCase()}
                      </Tag>
                      <span style={{ color: '#888', fontSize: 11 }}>{item.identifier}</span>
                    </Flexbox>
                  }
                />
              </List.Item>
            )}
          />
        </Flexbox>
      </div>

      <Modal
        open={!!editing}
        title="编辑技能显示信息"
        onCancel={() => setEditing(null)}
        onOk={onConfirmEdit}
      >
        <Flexbox gap={12}>
          <div>
            <div style={{ marginBottom: 4, fontSize: 13 }}>显示标题（留空使用市场原标题）</div>
            <Input
              placeholder={editing?.identifier}
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
            />
          </div>
          <div>
            <div style={{ marginBottom: 4, fontSize: 13 }}>显示描述（留空使用市场原描述）</div>
            <Input.TextArea
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

GlobalPluginManager.displayName = 'GlobalPluginManager';

interface ManualAddRowProps {
  disabled?: boolean;
  existingIds: Set<string>;
  onAdd: (identifier: string, type: 'mcp' | 'skill', title?: string, description?: string) => void;
  searchType: 'mcp' | 'skill';
}

/** Fallback path when market search is unreachable: paste identifier to add directly. */
const ManualAddRow = memo<ManualAddRowProps>(({ disabled, existingIds, onAdd, searchType }) => {
  const [id, setId] = useState('');
  const duplicate = id ? existingIds.has(`${searchType}:${id}`) : false;

  return (
    <Flexbox
      horizontal
      gap={8}
      style={{ borderTop: '1px dashed var(--lobe-color-border-secondary, #ddd)', paddingTop: 12 }}
    >
      <Input
        placeholder={`或直接粘贴 ${searchType} identifier，例如 github.com/owner/name`}
        value={id}
        onChange={(e) => setId(e.target.value.trim())}
      />
      <Button
        disabled={!id || duplicate || disabled}
        icon={<Plus size={14} />}
        type="primary"
        onClick={() => {
          onAdd(id, searchType);
          setId('');
        }}
      >
        {duplicate ? '已添加' : '直接添加'}
      </Button>
    </Flexbox>
  );
});

ManualAddRow.displayName = 'ManualAddRow';

export default GlobalPluginManager;
