'use client';

import { memo } from 'react';

import { useAiInfraStore } from '@/store/aiInfra';
import { useUserMemoryStore } from '@/store/userMemory';

interface DeferredStoreInitializationProps {
  enabled: boolean;
  isLogin: boolean;
}

const DeferredStoreInitialization = memo<DeferredStoreInitializationProps>(
  ({ enabled, isLogin }) => {
    const useInitAiProviderKeyVaults = useAiInfraStore((s) => s.useFetchAiProviderRuntimeState);
    const useFetchPersona = useUserMemoryStore((s) => s.useFetchPersona);

    useInitAiProviderKeyVaults(isLogin, false, enabled);
    useFetchPersona(enabled && isLogin);

    return null;
  },
);

export default DeferredStoreInitialization;
