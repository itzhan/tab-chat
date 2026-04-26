import { lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';

import { isDesktop } from '@/const/version';
import SettingHeader from '@/routes/(main)/settings/features/SettingHeader';

import Conversation from './features/Conversation';
import Essential from './features/Essential';

const Desktop = lazy(() => import('./features/Desktop'));

const Page = () => {
  const { t } = useTranslation('setting');
  return (
    <>
      <SettingHeader title={t('tab.hotkey')} />
      {isDesktop && (
        <Suspense fallback={null}>
          <Desktop />
        </Suspense>
      )}
      <Essential />
      <Conversation />
    </>
  );
};

export default Page;
