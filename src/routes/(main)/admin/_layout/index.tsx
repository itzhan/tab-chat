import { Flexbox } from '@lobehub/ui';
import { Navigate, Outlet } from 'react-router-dom';

import { useUserStore } from '@/store/user';
import { userProfileSelectors } from '@/store/user/selectors';

import AdminSidebar from './Sidebar';

const AdminLayout = () => {
  const role = useUserStore(userProfileSelectors.userRole);
  const isLoaded = useUserStore((s) => s.isUserStateInit);

  if (!isLoaded) return null;
  if (role !== 'admin') return <Navigate replace to="/" />;

  return (
    <Flexbox horizontal height="100%" style={{ overflow: 'hidden' }} width="100%">
      <AdminSidebar />
      <Flexbox flex={1} style={{ overflow: 'auto' }}>
        <Outlet />
      </Flexbox>
    </Flexbox>
  );
};

export default AdminLayout;
