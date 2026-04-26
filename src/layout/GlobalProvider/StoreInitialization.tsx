'use client';

import { INBOX_SESSION_ID } from '@lobechat/const';
import { lazy, memo, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { createStoreUpdater } from 'zustand-utils';

import { useIsMobile } from '@/hooks/useIsMobile';
import { useAgentStore } from '@/store/agent';
import { useGlobalStore } from '@/store/global';
import { useServerConfigStore } from '@/store/serverConfig';
import { serverConfigSelectors } from '@/store/serverConfig/selectors';
import { useUserStore } from '@/store/user';
import { authSelectors } from '@/store/user/selectors';

import { useUserStateRedirect } from './useUserStateRedirect';

const DeferredStoreInitialization = lazy(() => import('./DeferredStoreInitialization'));

const shouldInitBuiltinAgent = (pathname: string) =>
  pathname === '/' || pathname.startsWith('/agent') || pathname.startsWith('/onboarding');

const shouldInitDeferredStores = (pathname: string) =>
  pathname === '/' ||
  pathname.startsWith('/agent') ||
  pathname.startsWith('/group') ||
  pathname.startsWith('/settings/provider') ||
  pathname.startsWith('/settings/service-model') ||
  pathname.startsWith('/image') ||
  pathname.startsWith('/video');

const StoreInitialization = memo(() => {
  // prefetch error ns to avoid don't show error content correctly
  useTranslation('error');

  const [isLogin, useInitUserState] = useUserStore((s) => [
    authSelectors.isLogin(s),
    s.useInitUserState,
  ]);

  const { serverConfig } = useServerConfigStore();

  const [useInitSystemStatus, useCheckServerVersion] = useGlobalStore((s) => [
    s.useInitSystemStatus,
    s.useCheckServerVersion,
  ]);

  const useInitBuiltinAgent = useAgentStore((s) => s.useInitBuiltinAgent);
  const { pathname } = useLocation();

  // init the system preference
  useInitSystemStatus();

  // check server version in desktop app
  useCheckServerVersion();

  // fetch server config
  const useFetchServerConfig = useServerConfigStore((s) => s.useInitServerConfig);
  useFetchServerConfig();

  // Update NextAuth status
  const useUserStoreUpdater = createStoreUpdater(useUserStore);
  const oAuthSSOProviders = useServerConfigStore(serverConfigSelectors.oAuthSSOProviders);
  useUserStoreUpdater('oAuthSSOProviders', oAuthSSOProviders);

  /**
   * The store function of `isLogin` will both consider the values of `enableAuth` and `isSignedIn`.
   * But during initialization, the value of `enableAuth` might be incorrect cause of the async fetch.
   * So we need to use `isSignedIn` only to determine whether request for the default agent config and user state.
   *
   * IMPORTANT: Explicitly convert to boolean to avoid passing null/undefined downstream,
   * which would cause unnecessary API requests with invalid login state.
   */
  const isLoginOnInit = Boolean(isLogin);

  // init inbox agent via builtin agent mechanism only on chat/home/onboarding surfaces
  useInitBuiltinAgent(INBOX_SESSION_ID, {
    isLogin: shouldInitBuiltinAgent(pathname) ? isLoginOnInit : false,
  });

  const onUserStateSuccess = useUserStateRedirect();

  // init user state
  useInitUserState(isLoginOnInit, serverConfig, {
    onSuccess: onUserStateSuccess,
  });

  const useStoreUpdater = createStoreUpdater(useGlobalStore);

  const mobile = useIsMobile();

  useStoreUpdater('isMobile', mobile);

  return (
    <Suspense>
      <DeferredStoreInitialization
        enabled={shouldInitDeferredStores(pathname)}
        isLogin={isLoginOnInit}
      />
    </Suspense>
  );
});

export default StoreInitialization;
