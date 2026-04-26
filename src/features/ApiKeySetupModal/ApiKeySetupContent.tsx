'use client';

import { Button, Flexbox, Text } from '@lobehub/ui';
import { useModalContext } from '@lobehub/ui/base-ui';
import { memo, useState } from 'react';

import { message } from '@/components/AntdStaticMethods';
import { FormPassword } from '@/components/FormInput';
import { aiProviderSelectors, useAiInfraStore } from '@/store/aiInfra';

const isProviderApiKeyTarget = (
  settings: { authType?: string; showApiKey?: boolean } | undefined,
): boolean => {
  if (!settings) return false;
  if (settings.authType === 'oauthDeviceFlow') return false;
  if (settings.showApiKey === false) return false;
  return true;
};

const ApiKeySetupContent = memo(() => {
  const { close } = useModalContext();
  const [apiKey, setApiKey] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const enabledProviders = useAiInfraStore(aiProviderSelectors.enabledAiProviderList);
  const runtimeMap = useAiInfraStore((s) => s.aiProviderRuntimeConfig);
  const updateAiProviderConfig = useAiInfraStore((s) => s.updateAiProviderConfig);

  const targets = enabledProviders.filter((p) =>
    isProviderApiKeyTarget(runtimeMap[p.id]?.settings),
  );

  const handleSave = async () => {
    const trimmed = apiKey.trim();
    if (!trimmed) {
      message.warning('请输入 API Key');
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
          输入一次，自动应用到所有需要 API Key 的服务商
          {targets.length > 0 && `（共 ${targets.length} 个）`}
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
        <Button loading={submitting} type={'primary'} onClick={handleSave}>
          保存并应用
        </Button>
      </Flexbox>
    </Flexbox>
  );
});

ApiKeySetupContent.displayName = 'ApiKeySetupContent';

export default ApiKeySetupContent;
