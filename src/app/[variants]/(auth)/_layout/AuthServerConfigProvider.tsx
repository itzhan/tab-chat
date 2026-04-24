'use client';

import { createContext, memo, type ReactNode, useContext } from 'react';

import { type GlobalServerConfig } from '@/types/serverConfig';

interface AuthServerConfigState {
  isMobile?: boolean;
  segmentVariants?: string;
  serverConfig: GlobalServerConfig;
  serverConfigInit: boolean;
}

const AuthServerConfigContext = createContext<AuthServerConfigState | null>(null);

interface Props {
  children: ReactNode;
  isMobile?: boolean;
  segmentVariants?: string;
  serverConfig?: GlobalServerConfig;
}

export const AuthServerConfigProvider = memo<Props>(
  ({ children, serverConfig, isMobile, segmentVariants }) => (
    <AuthServerConfigContext
      value={{
        isMobile,
        segmentVariants,
        serverConfig: serverConfig || { aiProvider: {}, telemetry: {} },
        serverConfigInit: true,
      }}
    >
      {children}
    </AuthServerConfigContext>
  ),
);

export function useAuthServerConfigStore<T>(selector: (state: AuthServerConfigState) => T): T {
  // eslint-disable-next-line @eslint-react/no-use-context
  const state = useContext(AuthServerConfigContext);
  if (!state) throw new Error('Missing AuthServerConfigProvider');
  return selector(state);
}
