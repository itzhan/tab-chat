'use client';

import { createModal } from '@lobehub/ui/base-ui';

import AuthModalContent from './AuthModalContent';

interface CreateAuthModalParams {
  callbackUrl?: string;
  initialMode?: 'signin' | 'signup';
}

export const createAuthModal = (params: CreateAuthModalParams = {}) =>
  createModal({
    content: <AuthModalContent {...params} />,
    footer: null,
    maskClosable: true,
    styles: {
      content: { overflow: 'hidden', padding: 0 },
    },
    title: null,
    width: 'min(100%, 440px)',
  });
