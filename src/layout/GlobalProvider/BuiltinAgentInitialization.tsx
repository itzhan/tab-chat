'use client';

import { memo } from 'react';

import { WEB_INBOX_SESSION_ID } from '@/const/webConstants';
import { useAgentStore } from '@/store/agent';

interface BuiltinAgentInitializationProps {
  isLogin: boolean;
}

const BuiltinAgentInitialization = memo<BuiltinAgentInitializationProps>(({ isLogin }) => {
  const useInitBuiltinAgent = useAgentStore((s) => s.useInitBuiltinAgent);

  useInitBuiltinAgent(WEB_INBOX_SESSION_ID, { isLogin });

  return null;
});

BuiltinAgentInitialization.displayName = 'BuiltinAgentInitialization';

export default BuiltinAgentInitialization;
