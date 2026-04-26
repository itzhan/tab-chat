'use client';

import { lazy, memo, Suspense, useEffect, useState } from 'react';

import { useGlobalStore } from '@/store/global';

// Lazy load the CommandMenu component with React lazy
// This splits the CommandMenu code into a separate chunk that only loads when needed
const CmdkComponent = lazy(() => import('@/features/CommandMenu'));

const CmdkLazy = memo(() => {
  const open = useGlobalStore((s) => s.status.showCommandMenu);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    if (open) setHasLoaded(true);
  }, [open]);

  if (!hasLoaded) return null;

  return (
    <Suspense fallback={null}>
      <CmdkComponent />
    </Suspense>
  );
});

CmdkLazy.displayName = 'CmdkLazy';

export default CmdkLazy;
