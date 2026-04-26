'use client';

import type { RouteObject } from 'react-router-dom';

import {
  BusinessDesktopRoutesWithMainLayout,
  BusinessDesktopRoutesWithoutMainLayout,
} from '@/business/client/BusinessDesktopRoutes';
import { dynamicElement, dynamicLayout, ErrorBoundary, redirectElement } from '@/utils/router';

export const webRoutes: RouteObject[] = [
  {
    children: [
      {
        children: [
          {
            element: redirectElement('/'),
            index: true,
          },
          {
            children: [
              {
                element: dynamicElement(() => import('@/routes/(main)/agent'), 'Web > Chat'),
                index: true,
              },
              {
                element: dynamicElement(
                  () => import('@/routes/(main)/agent/profile'),
                  'Web > Chat > Profile',
                ),
                path: 'profile',
              },
              {
                element: dynamicElement(
                  () => import('@/routes/(main)/agent/cron/[cronId]'),
                  'Web > Chat > Cron Detail',
                ),
                path: 'cron/:cronId',
              },
              {
                element: dynamicElement(
                  () => import('@/routes/(main)/agent/channel'),
                  'Web > Chat > Channel',
                ),
                path: 'channel',
              },
            ],
            element: dynamicLayout(
              () => import('@/routes/(main)/agent/_layout'),
              'Web > Chat > Layout',
            ),
            errorElement: <ErrorBoundary resetPath="/agent" />,
            path: ':aid',
          },
        ],
        path: 'agent',
      },
      {
        children: [
          {
            element: redirectElement('/'),
            index: true,
          },
          {
            children: [
              {
                element: dynamicElement(() => import('@/routes/(main)/group'), 'Web > Group'),
                index: true,
              },
              {
                element: dynamicElement(
                  () => import('@/routes/(main)/group/profile'),
                  'Web > Group > Profile',
                ),
                path: 'profile',
              },
            ],
            element: dynamicLayout(
              () => import('@/routes/(main)/group/_layout'),
              'Web > Group > Layout',
            ),
            errorElement: <ErrorBoundary resetPath="/group" />,
            path: ':gid',
          },
        ],
        path: 'group',
      },
      {
        children: [
          {
            children: [
              {
                children: [
                  {
                    element: dynamicElement(
                      () => import('@/routes/(main)/community/(list)/agent'),
                      'Web > Community > Agent',
                    ),
                    index: true,
                  },
                ],
                element: dynamicElement(
                  () => import('@/routes/(main)/community/(list)/agent/_layout'),
                  'Web > Community > Agent > Layout',
                ),
                path: 'agent',
              },
              {
                children: [
                  {
                    element: dynamicElement(
                      () => import('@/routes/(main)/community/(list)/model'),
                      'Web > Community > Model',
                    ),
                    index: true,
                  },
                ],
                element: dynamicElement(
                  () => import('@/routes/(main)/community/(list)/model/_layout'),
                  'Web > Community > Model > Layout',
                ),
                path: 'model',
              },
              {
                element: dynamicElement(
                  () => import('@/routes/(main)/community/(list)/provider'),
                  'Web > Community > Provider',
                ),
                path: 'provider',
              },
              {
                element: dynamicElement(
                  () => import('@/routes/(main)/community/(list)/(home)'),
                  'Web > Community > Home',
                ),
                index: true,
              },
            ],
            element: dynamicElement(
              () => import('@/routes/(main)/community/(list)/_layout'),
              'Web > Community > List Layout',
            ),
          },
          {
            children: [
              {
                element: dynamicElement(
                  () => import('@/routes/(main)/community/(detail)/agent'),
                  'Web > Community > Agent Detail',
                ),
                path: 'agent/:slug',
              },
              {
                element: dynamicElement(
                  () => import('@/routes/(main)/community/(detail)/group_agent'),
                  'Web > Community > Group Agent Detail',
                ),
                path: 'group_agent/:slug',
              },
              {
                element: dynamicElement(
                  () => import('@/routes/(main)/community/(detail)/model'),
                  'Web > Community > Model Detail',
                ),
                path: 'model/:slug',
              },
              {
                element: dynamicElement(
                  () => import('@/routes/(main)/community/(detail)/provider'),
                  'Web > Community > Provider Detail',
                ),
                path: 'provider/:slug',
              },
              {
                element: dynamicElement(
                  () => import('@/routes/(main)/community/(detail)/user'),
                  'Web > Community > User Detail',
                ),
                path: 'user/:slug',
              },
            ],
            element: dynamicElement(
              () => import('@/routes/(main)/community/(detail)/_layout'),
              'Web > Community > Detail Layout',
            ),
          },
        ],
        element: dynamicElement(
          () => import('@/routes/(main)/community/_layout'),
          'Web > Community > Layout',
        ),
        errorElement: <ErrorBoundary resetPath="/community" />,
        path: 'community',
      },
      {
        children: [
          {
            children: [
              {
                element: dynamicElement(
                  () => import('@/routes/(main)/resource/(home)'),
                  'Web > Resource > Home',
                ),
                index: true,
              },
            ],
            element: dynamicElement(
              () => import('@/routes/(main)/resource/(home)/_layout'),
              'Web > Resource > Home Layout',
            ),
          },
          {
            children: [
              {
                element: dynamicElement(
                  () => import('@/routes/(main)/resource/library'),
                  'Web > Resource > Library',
                ),
                index: true,
              },
              {
                element: dynamicElement(
                  () => import('@/routes/(main)/resource/library/[slug]'),
                  'Web > Resource > Library Slug',
                ),
                path: ':slug',
              },
            ],
            element: dynamicElement(
              () => import('@/routes/(main)/resource/library/_layout'),
              'Web > Resource > Library Layout',
            ),
            path: 'library/:id',
          },
        ],
        element: dynamicElement(
          () => import('@/routes/(main)/resource/_layout'),
          'Web > Resource > Layout',
        ),
        errorElement: <ErrorBoundary resetPath="/resource" />,
        path: 'resource',
      },
      {
        children: [
          {
            element: dynamicElement(
              () => import('@/routes/(main)/membership/(home)'),
              'Web > Membership',
            ),
            index: true,
          },
        ],
        element: dynamicElement(
          () => import('@/routes/(main)/membership/_layout'),
          'Web > Membership > Layout',
        ),
        errorElement: <ErrorBoundary resetPath="/membership" />,
        path: 'membership',
      },
      {
        children: [
          {
            element: redirectElement('/settings/profile'),
            index: true,
          },
          {
            children: [
              {
                element: redirectElement('/settings/provider/all'),
                index: true,
              },
              {
                element: dynamicElement(
                  () =>
                    import('@/routes/(main)/settings/provider').then((m) => m.ProviderDetailPage),
                  'Web > Settings > Provider Detail',
                ),
                path: ':providerId',
              },
            ],
            element: dynamicElement(
              () => import('@/routes/(main)/settings/provider').then((m) => m.ProviderLayout),
              'Web > Settings > Provider Layout',
            ),
            path: 'provider',
          },
          {
            element: dynamicElement(() => import('@/routes/(main)/settings'), 'Web > Settings'),
            path: ':tab',
          },
        ],
        element: dynamicElement(
          () => import('@/routes/(main)/settings/_layout'),
          'Web > Settings > Layout',
        ),
        errorElement: <ErrorBoundary resetPath="/settings" />,
        path: 'settings',
      },
      {
        children: [
          {
            element: dynamicElement(() => import('@/routes/(main)/(create)/image'), 'Web > Image'),
            index: true,
          },
        ],
        element: dynamicLayout(
          () => import('@/routes/(main)/(create)/image/_layout'),
          'Web > Image > Layout',
        ),
        errorElement: <ErrorBoundary resetPath="/image" />,
        path: 'image',
      },
      {
        children: [
          {
            element: dynamicElement(() => import('@/routes/(main)/(create)/video'), 'Web > Video'),
            index: true,
          },
        ],
        element: dynamicLayout(
          () => import('@/routes/(main)/(create)/video/_layout'),
          'Web > Video > Layout',
        ),
        errorElement: <ErrorBoundary resetPath="/video" />,
        path: 'video',
      },
      {
        children: [
          {
            element: dynamicElement(() => import('@/routes/(main)/page'), 'Web > Page'),
            index: true,
          },
          {
            element: dynamicElement(() => import('@/routes/(main)/page/[id]'), 'Web > Page Detail'),
            path: ':id',
          },
        ],
        element: dynamicLayout(() => import('@/routes/(main)/page/_layout'), 'Web > Page > Layout'),
        errorElement: <ErrorBoundary resetPath="/page" />,
        path: 'page',
      },
      ...BusinessDesktopRoutesWithMainLayout,
      {
        element: dynamicElement(() => import('@/routes/(main)/home/WebHome'), 'Web > Home'),
        index: true,
      },
      {
        element: redirectElement('/'),
        path: '*',
      },
    ],
    element: dynamicLayout(() => import('@/routes/(main)/_layout/WebLayout'), 'Web > Main Layout'),
    errorElement: <ErrorBoundary resetPath="/" />,
    path: '/',
  },
  ...BusinessDesktopRoutesWithoutMainLayout,
  {
    children: [
      {
        element: dynamicElement(() => import('@/routes/share/t/[id]'), 'Web > Share > Topic'),
        path: ':id',
      },
    ],
    element: dynamicElement(
      () => import('@/routes/share/t/[id]/_layout'),
      'Web > Share > Topic Layout',
    ),
    path: '/share/t',
  },
  {
    element: dynamicElement(() => import('@/routes/onboarding'), 'Web > Onboarding'),
    errorElement: <ErrorBoundary resetPath="/" />,
    path: '/onboarding',
  },
  {
    element: dynamicElement(() => import('@/routes/onboarding/agent'), 'Web > Onboarding Agent'),
    errorElement: <ErrorBoundary resetPath="/" />,
    path: '/onboarding/agent',
  },
  {
    element: dynamicElement(
      () => import('@/routes/onboarding/classic'),
      'Web > Onboarding Classic',
    ),
    errorElement: <ErrorBoundary resetPath="/" />,
    path: '/onboarding/classic',
  },
];
