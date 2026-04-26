import { Flexbox } from '@lobehub/ui';
import { type FC, lazy, Suspense } from 'react';
import { Outlet } from 'react-router-dom';

import { isDesktop } from '@/const/version';
import { useInitAgentConfig } from '@/hooks/useInitAgentConfig';
import AgentIdSync from '@/routes/(main)/agent/_layout/AgentIdSync';

import PortalAutoCollapse from './PortalAutoCollapse';
import RegisterHotkeys from './RegisterHotkeys';
import Sidebar from './Sidebar';
import { styles } from './style';

const ProtocolUrlHandler = lazy(() => import('@/features/ProtocolUrlHandler'));

const Layout: FC = () => {
  useInitAgentConfig();

  return (
    <>
      <Sidebar />
      <Flexbox className={styles.mainContainer} flex={1} height={'100%'}>
        <Outlet />
      </Flexbox>
      <RegisterHotkeys />
      <Suspense fallback={null}>{isDesktop && <ProtocolUrlHandler />}</Suspense>
      <AgentIdSync />
      <PortalAutoCollapse />
    </>
  );
};

export default Layout;
