'use client';

import { Flexbox } from '@lobehub/ui';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

import SideBarHeaderLayout from '@/features/NavPanel/SideBarHeaderLayout';
import StorageUsage from '@/features/StorageUsage';

import CategoryMenu from './CategoryMenu';

const Header = memo(() => {
  const { t } = useTranslation('common');

  return (
    <>
      <SideBarHeaderLayout
        breadcrumb={[
          {
            href: '/resource',
            title: t('tab.resource'),
          },
        ]}
      />
      <Flexbox paddingBlock={8} paddingInline={16}>
        <StorageUsage compact />
      </Flexbox>
      <CategoryMenu />
    </>
  );
});

export default Header;
