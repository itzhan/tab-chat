'use client';

import { type FC } from 'react';
import { Outlet } from 'react-router-dom';

import { DndContextWrapper } from '@/routes/(main)/resource/features/DndContextWrapper';

import RegisterHotkeys from './RegisterHotkeys';

const ResourceLayout: FC = () => {
  return (
    <DndContextWrapper>
      <Outlet />
      <RegisterHotkeys />
    </DndContextWrapper>
  );
};

export default ResourceLayout;
