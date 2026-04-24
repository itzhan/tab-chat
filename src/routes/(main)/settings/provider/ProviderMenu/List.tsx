'use client';

import {
  Accordion,
  AccordionItem,
  ActionIcon,
  ContextMenuTrigger,
  Flexbox,
  stopPropagation,
  Text,
} from '@lobehub/ui';
import isEqual from 'fast-deep-equal';
import { ArrowDownUpIcon } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { aiProviderSelectors } from '@/store/aiInfra';
import { useAiInfraStore } from '@/store/aiInfra/store';
import { useGlobalStore } from '@/store/global';
import { systemStatusSelectors } from '@/store/global/selectors';
import { useUserStore } from '@/store/user';
import { userProfileSelectors } from '@/store/user/selectors';

import Actions from './Actions';
import All from './All';
import ProviderItem from './Item';
import SortProviderModal from './SortProviderModal';
import { SortType, useProviderDropdownMenu } from './useDropdownMenu';

const ProviderList = (props: {
  mobile?: boolean;
  onProviderSelect: (providerKey: string) => void;
}) => {
  const { onProviderSelect, mobile } = props;
  const { t } = useTranslation('modelProvider');
  const [open, setOpen] = useState(false);

  // Accordion states - using array of active keys
  const [expandedKeys, setExpandedKeys] = useState<string[]>(['enabled', 'custom', 'disabled']);

  const [sortType, updateSystemStatus] = useGlobalStore((s) => [
    systemStatusSelectors.disabledModelProvidersSortType(s),
    s.updateSystemStatus,
  ]);

  const updateSortType = useCallback(
    (newSortType: SortType) => {
      updateSystemStatus({ disabledModelProvidersSortType: newSortType });
    },
    [updateSystemStatus],
  );

  const dropdownMenu = useProviderDropdownMenu({
    onSortChange: updateSortType,
    sortType: (sortType || SortType.Default) as SortType,
  });

  const isAdmin = useUserStore(userProfileSelectors.isAdmin);
  const runtimeConfig = useAiInfraStore((s) => s.aiProviderRuntimeConfig);

  const enabledAll = useAiInfraStore(aiProviderSelectors.enabledAiProviderList, isEqual);
  const disabledAll = useAiInfraStore(aiProviderSelectors.disabledAiProviderList, isEqual);
  const disabledCustomAll = useAiInfraStore(
    aiProviderSelectors.disabledCustomAiProviderList,
    isEqual,
  );

  // Non-admin users only see providers where the admin has explicitly enabled
  // "user brings own API key" — they're the only ones the user can configure.
  const byoFilter = (p: { id: string }) => !!runtimeConfig?.[p.id]?.settings?.allowUserApiKey;

  const enabledModelProviderList = isAdmin ? enabledAll : enabledAll.filter(byoFilter);
  const disabledModelProviderList = isAdmin ? disabledAll : [];
  const disabledCustomProviderList = isAdmin ? disabledCustomAll : [];

  // Sort model providers based on sort type
  const sortedDisabledProviders = useMemo(() => {
    const providers = [...disabledModelProviderList];
    const currentSortType = (sortType || SortType.Default) as SortType;
    switch (currentSortType) {
      case SortType.Alphabetical: {
        return providers.sort((a, b) => {
          const cmpDisplay = (a.name || a.id).localeCompare(b.name || b.id);
          if (cmpDisplay !== 0) return cmpDisplay;
          return a.id.localeCompare(b.id);
        });
      }
      case SortType.AlphabeticalDesc: {
        return providers.sort((a, b) => {
          const cmpDisplay = (b.name || a.id).localeCompare(a.name || b.id);
          if (cmpDisplay !== 0) return cmpDisplay;
          return b.id.localeCompare(a.id);
        });
      }
      case SortType.Default: {
        return providers;
      }
    }
  }, [disabledModelProviderList, sortType]);

  // Friendly empty state for non-admin users: either the runtime config
  // hasn't loaded yet (`runtimeConfig` is `{}`) or the admin simply hasn't
  // enabled BYO on anything. Either way, showing a blank sidebar with no
  // context feels broken — spell it out instead.
  if (!isAdmin && enabledModelProviderList.length === 0) {
    return (
      <Flexbox gap={8} padding={16} style={{ color: '#888', fontSize: 13, lineHeight: 1.6 }}>
        <div>管理员尚未开放任何服务商让用户自定义 API Key。</div>
        <div>
          如需使用自己的密钥，请联系管理员在服务商设置里打开&ldquo;允许用户使用自己的 API
          Key&rdquo;。
        </div>
      </Flexbox>
    );
  }

  return (
    <Flexbox gap={4} paddingInline={4} style={{ paddingBottom: 32 }}>
      {!mobile && isAdmin && <All onClick={onProviderSelect} />}
      {open && (
        <SortProviderModal
          defaultItems={enabledModelProviderList}
          open={open}
          onCancel={() => {
            setOpen(false);
          }}
        />
      )}
      <Accordion
        expandedKeys={expandedKeys}
        onExpandedChange={(keys) => setExpandedKeys(keys as string[])}
      >
        {/* Enabled Providers */}
        <AccordionItem
          headerWrapper={(header) => <ContextMenuTrigger items={[]}>{header}</ContextMenuTrigger>}
          itemKey="enabled"
          paddingBlock={4}
          paddingInline={'8px 4px'}
          action={
            <div onClick={stopPropagation}>
              <ActionIcon
                icon={ArrowDownUpIcon}
                size={'small'}
                title={t('menu.sort')}
                onClick={() => setOpen(true)}
              />
            </div>
          }
          title={
            <Text ellipsis fontSize={12} type={'secondary'} weight={500}>
              {t('menu.list.enabled')}
            </Text>
          }
        >
          <Flexbox gap={4} paddingBlock={1}>
            {enabledModelProviderList.map((item) => (
              <ProviderItem {...item} key={item.id} onClick={onProviderSelect} />
            ))}
          </Flexbox>
        </AccordionItem>

        {/* Custom Providers */}
        {disabledCustomProviderList.length > 0 && (
          <AccordionItem
            headerWrapper={(header) => <ContextMenuTrigger items={[]}>{header}</ContextMenuTrigger>}
            itemKey="custom"
            paddingBlock={4}
            paddingInline={'8px 4px'}
            title={
              <Text ellipsis fontSize={12} type={'secondary'} weight={500}>
                {t('menu.list.custom')}
              </Text>
            }
          >
            <Flexbox gap={4} paddingBlock={1}>
              {disabledCustomProviderList.map((item) => (
                <ProviderItem {...item} key={item.id} onClick={onProviderSelect} />
              ))}
            </Flexbox>
          </AccordionItem>
        )}

        {/* Disabled Providers */}
        <AccordionItem
          itemKey="disabled"
          paddingBlock={4}
          paddingInline={'8px 4px'}
          action={
            disabledModelProviderList.length > 1 ? (
              <Actions dropdownMenu={dropdownMenu} />
            ) : undefined
          }
          headerWrapper={(header) => (
            <ContextMenuTrigger items={disabledModelProviderList.length > 1 ? dropdownMenu : []}>
              {header}
            </ContextMenuTrigger>
          )}
          title={
            <Text ellipsis fontSize={12} type={'secondary'} weight={500}>
              {t('menu.list.disabled')}
            </Text>
          }
        >
          <Flexbox gap={4} paddingBlock={1}>
            {sortedDisabledProviders.map((item) => (
              <ProviderItem {...item} key={item.id} onClick={onProviderSelect} />
            ))}
          </Flexbox>
        </AccordionItem>
      </Accordion>
    </Flexbox>
  );
};

export default ProviderList;
