'use client';

import { type ReactNode } from 'react';
import { memo } from 'react';

import { type IFeatureFlags } from '@/config/featureFlags';
import { mapFeatureFlagsEnvToState } from '@/config/featureFlags';
import { type GlobalServerConfig } from '@/types/serverConfig';

import { createServerConfigStore, Provider } from './store';

interface GlobalStoreProviderProps {
  children: ReactNode;
  featureFlags?: Partial<IFeatureFlags>;
  isMobile?: boolean;
  segmentVariants?: string;
  serverConfig?: GlobalServerConfig;
}

export const ServerConfigStoreProvider = memo<GlobalStoreProviderProps>(
  ({ children, featureFlags, serverConfig, isMobile, segmentVariants }) => (
    <Provider
      createStore={() =>
        createServerConfigStore({
          featureFlags: featureFlags ? mapFeatureFlagsEnvToState(featureFlags) : undefined,
          isMobile,
          segmentVariants,
          serverConfig,
          // When the SSR payload is present, treat the store as already initialized so
          // StoreInitialization's useInitServerConfig hook skips the duplicate trpc fetch.
          serverConfigInit: Boolean(serverConfig),
        })
      }
    >
      {children}
    </Provider>
  ),
);
