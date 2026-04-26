import type { RouteObject } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { webRoutes } from './webRouter.config';

const flattenPaths = (routes: RouteObject[], parent = ''): string[] =>
  routes.flatMap((route) => {
    const routePath = route.path;
    const path = routePath
      ? routePath.startsWith('/')
        ? routePath
        : [parent, routePath].filter(Boolean).join('/').replaceAll('//', '/')
      : parent;

    const current = route.index ? [`${path || '/'}#index`] : routePath ? [path || '/'] : [];
    const children = route.children ? flattenPaths(route.children, path) : [];

    return [...current, ...children];
  });

describe('webRoutes', () => {
  it('keeps web routes focused on browser-facing surfaces', () => {
    const paths = flattenPaths(webRoutes);

    expect(paths).toContain('/#index');
    expect(paths).toContain('/agent/:aid');
    expect(paths).toContain('/settings/:tab');
    expect(paths).toContain('/page/:id');
    expect(paths).toContain('/share/t/:id');
    expect(paths).toContain('/onboarding');

    expect(paths).not.toContain('/admin');
    expect(paths).not.toContain('/memory');
    expect(paths).not.toContain('/eval');
  });
});
