'use client';

import { Button, Flexbox, Text } from '@lobehub/ui';
import { useModalContext } from '@lobehub/ui/base-ui';
import { memo, useState } from 'react';

import { message } from '@/components/AntdStaticMethods';
import { FormPassword } from '@/components/FormInput';
import { useAiInfraStore } from '@/store/aiInfra';

const isProviderApiKeyTarget = (
  settings: { authType?: string; showApiKey?: boolean } | undefined,
): boolean => {
  // No runtime config loaded yet → assume the standard apiKey shape so we
  // don't filter out fresh providers (e.g. a brand-new account whose
  // aiProviderRuntimeConfig hasn't finished its first SWR fetch).
  if (!settings) return true;
  if (settings.authType === 'oauthDeviceFlow') return false;
  if (settings.showApiKey === false) return false;
  return true;
};

const ApiKeySetupContent = memo(() => {
  const { close } = useModalContext();
  const [apiKey, setApiKey] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Use the full provider list (incl. providers the user hasn't enabled yet) so
  // a freshly-registered account — which has zero enabled providers by default —
  // can still apply one key everywhere. Users opt providers in/out via the
  // settings page; the apiKey written here just lies dormant until they do.
  const allProviders = useAiInfraStore((s) => s.aiProviderList);
  const runtimeMap = useAiInfraStore((s) => s.aiProviderRuntimeConfig);
  const updateAiProviderConfig = useAiInfraStore((s) => s.updateAiProviderConfig);
  const useFetchAiProviderList = useAiInfraStore((s) => s.useFetchAiProviderList);

  // Make sure the list is fetched even if the user opens this modal before the
  // settings sidebar has mounted. SWR de-dupes, so this is free when cached.
  useFetchAiProviderList();

  const isListLoading = allProviders.length === 0;
  const targets = allProviders.filter((p) => isProviderApiKeyTarget(runtimeMap[p.id]?.settings));

  const handleSave = async () => {
    const trimmed = apiKey.trim();
    if (!trimmed) {
      message.warning('请输入 API Key');
      return;
    }
    if (isListLoading) {
      message.warning('服务商列表加载中，请稍候再试');
      return;
    }
    if (targets.length === 0) {
      message.warning('当前没有可应用的服务商');
      return;
    }

    setSubmitting(true);
    try {
      await Promise.all(
        targets.map((p) => {
          const existing = runtimeMap[p.id]?.keyVaults ?? {};
          return updateAiProviderConfig(p.id, {
            keyVaults: { ...existing, apiKey: trimmed },
          });
        }),
      );
      message.success(`已应用到 ${targets.length} 个服务商`);
      close();
    } catch (error) {
      console.error('Failed to apply API key:', error);
      message.error('保存失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Flexbox gap={16} padding={24}>
      <Flexbox gap={4}>
        <Text fontSize={18} weight={'bold'}>
          设置 API Key
        </Text>
        <Text fontSize={13} type={'secondary'}>
          {isListLoading
            ? '正在加载服务商列表...'
            : `输入一次，自动应用到所有需要 API Key 的服务商（共 ${targets.length} 个）`}
        </Text>
      </Flexbox>

      <FormPassword
        autoComplete={'new-password'}
        placeholder={'sk-***********************'}
        size={'large'}
        value={apiKey}
        onChange={(value) => setApiKey(value as string)}
        onPressEnter={handleSave}
      />

      <Flexbox horizontal gap={8} justify={'flex-end'}>
        <Button onClick={close}>取消</Button>
        <Button disabled={isListLoading} loading={submitting} type={'primary'} onClick={handleSave}>
          保存并应用
        </Button>
      </Flexbox>
    </Flexbox>
  );
});

ApiKeySetupContent.displayName = 'ApiKeySetupContent';

export default ApiKeySetupContent;
