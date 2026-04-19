'use client';

import { Button } from '@lobehub/ui';
import { App, Space } from 'antd';
import { createStaticStyles } from 'antd-style';
import { customAlphabet } from 'nanoid/non-secure';
import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { SESSION_CHAT_URL } from '@/const/url';
import { agentService } from '@/services/agent';
import { discoverService } from '@/services/discover';
import { useAgentStore } from '@/store/agent';
import { useHomeStore } from '@/store/home';

import { useDetailContext } from '../../DetailProvider';

const styles = createStaticStyles(({ css }) => ({
  buttonGroup: css`
    width: 100%;
  `,
}));

const generateMarketIdentifier = () => {
  const alphabet = '0123456789abcdefghijklmnopqrstuvwxyz';
  const generate = customAlphabet(alphabet, 8);
  return generate();
};

const ForkAndChat = memo<{ mobile?: boolean }>(({ mobile }) => {
  const { identifier, title, config, avatar, backgroundColor, description, tags, editorData } =
    useDetailContext();
  const [loadingMode, setLoadingMode] = useState<'none' | 'add' | 'chat'>('none');
  const createAgent = useAgentStore((s) => s.createAgent);
  const refreshAgentList = useHomeStore((s) => s.refreshAgentList);
  const { message } = App.useApp();
  const navigate = useNavigate();
  const { t } = useTranslation('discover');

  const meta = {
    avatar,
    backgroundColor,
    description,
    marketIdentifier: identifier,
    tags,
    title,
  };

  const handleFork = async (navigateAfter: boolean) => {
    try {
      setLoadingMode(navigateAfter ? 'chat' : 'add');

      const existingAgentId = await agentService.getAgentByForkedFromIdentifier(identifier!);

      if (existingAgentId) {
        message.info(t('fork.alreadyForked'));
        if (navigateAfter) navigate(SESSION_CHAT_URL(existingAgentId, mobile));
        return;
      }

      if (!config) throw new Error('Agent config is missing');

      const newIdentifier = generateMarketIdentifier();

      const agentData = {
        config: {
          ...config,
          editorData,
          ...meta,
          marketIdentifier: newIdentifier,
          params: {
            ...config.params,
            forkedFromIdentifier: identifier,
          },
          title,
        },
      };

      const result = await createAgent(agentData);
      await refreshAgentList();

      discoverService.reportAgentEvent({
        event: 'add',
        identifier: newIdentifier,
        source: location.pathname,
      });

      message.success(t('fork.success'));

      if (navigateAfter && result?.agentId) {
        navigate(SESSION_CHAT_URL(result.agentId, mobile));
      }
    } catch (error: any) {
      console.error('Fork failed:', error);
      message.error(t('fork.failed'));
    } finally {
      setLoadingMode('none');
    }
  };

  return (
    <Space className={styles.buttonGroup} direction={'vertical'} style={{ width: '100%' }}>
      <Button
        block
        disabled={loadingMode === 'chat'}
        loading={loadingMode === 'add'}
        size={'large'}
        onClick={() => handleFork(false)}
      >
        {t('fork.addAgent' as any)}
      </Button>
      <Button
        block
        disabled={loadingMode === 'add'}
        loading={loadingMode === 'chat'}
        size={'large'}
        type={'primary'}
        onClick={() => handleFork(true)}
      >
        {t('fork.forkAndChat')}
      </Button>
    </Space>
  );
});

export default ForkAndChat;
