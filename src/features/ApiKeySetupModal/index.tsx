'use client';

import { createModal } from '@lobehub/ui/base-ui';

import ApiKeySetupContent from './ApiKeySetupContent';

export const createApiKeySetupModal = () =>
  createModal({
    content: <ApiKeySetupContent />,
    footer: null,
    maskClosable: true,
    styles: {
      content: { overflow: 'hidden', padding: 0 },
    },
    title: null,
    width: 'min(100%, 480px)',
  });
