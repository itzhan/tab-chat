import { Flexbox } from '@lobehub/ui';
import { type FC, lazy, Suspense } from 'react';
import { Outlet } from 'react-router-dom';

import { isDesktop } from '@/const/version';
import { useInitGroupConfig } from '@/hooks/useInitGroupConfig';

import GroupIdSync from './GroupIdSync';
import RegisterHotkeys from './RegisterHotkeys';
import Sidebar from './Sidebar';
import { styles } from './style';

const ProtocolUrlHandler = lazy(() => import('@/features/ProtocolUrlHandler'));

const Layout: FC = () => {
  useInitGroupConfig();

  return (
    <>
      <Sidebar />
      <Flexbox className={styles.mainContainer} flex={1} height={'100%'}>
        <Outlet />
      </Flexbox>
      <RegisterHotkeys />
      <Suspense fallback={null}>{isDesktop && <ProtocolUrlHandler />}</Suspense>
      <GroupIdSync />
    </>
  );
};

export default Layout;
