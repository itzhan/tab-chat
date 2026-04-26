'use client';

import { HotkeyScopeEnum } from '@lobechat/const/hotkeys';
import { Flexbox } from '@lobehub/ui';
import { cx } from 'antd-style';
import { lazy, Suspense } from 'react';
import { HotkeysProvider } from 'react-hotkeys-hook';
import { Outlet } from 'react-router-dom';

import Loading from '@/components/Loading/BrandTextLoading';
import NavPanel from '@/features/NavPanel';
import { useFeedbackModal } from '@/hooks/useFeedbackModal';
import { usePlatform } from '@/hooks/usePlatform';
import { MarketAuthProvider } from '@/layout/AuthProvider/MarketAuth';
import CmdkLazy from '@/layout/GlobalProvider/CmdkLazy';
import dynamic from '@/libs/next/dynamic';
import { featureFlagsSelectors, useServerConfigStore } from '@/store/serverConfig';

import DesktopLayoutContainer from './DesktopLayoutContainer';
import RegisterHotkeys from './RegisterHotkeys';
import { styles } from './style';

const FeedbackModal = lazy(() => import('@/components/FeedbackModal'));
const HotkeyHelperPanel = lazy(() => import('@/features/HotkeyHelperPanel'));
const CloudBanner = dynamic(() => import('@/features/AlertBanner/CloudBanner'));

const WebLayout = () => {
  const { isPWA } = usePlatform();
  const { showCloudPromotion } = useServerConfigStore(featureFlagsSelectors);
  const {
    initialValues: feedbackInitialValues,
    isOpen: isFeedbackModalOpen,
    close: closeFeedbackModal,
  } = useFeedbackModal();

  return (
    <HotkeysProvider initiallyActiveScopes={[HotkeyScopeEnum.Global]}>
      <Suspense fallback={null}>{showCloudPromotion && <CloudBanner />}</Suspense>
      <Flexbox
        horizontal
        className={cx(isPWA ? styles.mainContainerPWA : styles.mainContainer)}
        height={'100%'}
        width={'100%'}
      >
        <NavPanel showHomeFallback={false} />
        <DesktopLayoutContainer>
          <MarketAuthProvider isDesktop={false}>
            <Suspense fallback={<Loading debugId="WebMainLayout > Outlet" />}>
              <Outlet />
            </Suspense>
          </MarketAuthProvider>
        </DesktopLayoutContainer>
      </Flexbox>
      <Suspense fallback={null}>
        <HotkeyHelperPanel />
        <RegisterHotkeys />
        <CmdkLazy />
        {isFeedbackModalOpen && (
          <FeedbackModal
            initialValues={feedbackInitialValues}
            open={isFeedbackModalOpen}
            onClose={closeFeedbackModal}
          />
        )}
      </Suspense>
    </HotkeysProvider>
  );
};

export default WebLayout;
