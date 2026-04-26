'use client';

import { memo } from 'react';

import { useAiInfraStore } from '@/store/aiInfra';

interface DeferredStoreInitializationProps {
  enabled: boolean;
  isLogin: boolean;
}

const DeferredStoreInitialization = memo<DeferredStoreInitializationProps>(
  ({ enabled, isLogin }) => {
    const useInitAiProviderKeyVaults = useAiInfraStore((s) => s.useFetchAiProviderRuntimeState);

    useInitAiProviderKeyVaults(isLogin, false, enabled);

    return null;
  },
);

export default DeferredStoreInitialization;
