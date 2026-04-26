'use client';

import { type PropsWithChildren, type ReactNode } from 'react';
import { memo, useLayoutEffect, useSyncExternalStore } from 'react';

import Sidebar from '@/routes/(main)/home/_layout/Sidebar';

import { NavPanelDraggable } from './components/NavPanelDraggable';

export const NAV_PANEL_RIGHT_DRAWER_ID = 'nav-panel-drawer';

type NavPanelSnapshot = {
  key: string;
  node: ReactNode;
} | null;

let currentSnapshot: NavPanelSnapshot = null;
const listeners = new Set<() => void>();

const subscribeNavPanel = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const getNavPanelSnapshot = () => currentSnapshot;
const setNavPanelSnapshot = (snapshot: NavPanelSnapshot) => {
  currentSnapshot = snapshot;
  listeners.forEach((listener) => listener());
};

interface NavPanelProps {
  showHomeFallback?: boolean;
}

const NavPanelDrawerAnchor = () => (
  <div
    id={NAV_PANEL_RIGHT_DRAWER_ID}
    style={{
      height: '100%',
      position: 'relative',
      width: 0,
      zIndex: 10,
    }}
  />
);

const NavPanel = memo<NavPanelProps>(({ showHomeFallback = true }) => {
  const panelContent = useSyncExternalStore(
    subscribeNavPanel,
    getNavPanelSnapshot,
    getNavPanelSnapshot,
  );

  // Desktop keeps the home sidebar as a fallback. Web passes showHomeFallback=false
  // so non-home pages do not mount the agent/recents sidebar before their own portal is ready.
  const activeContent =
    panelContent || (showHomeFallback ? { key: 'home', node: <Sidebar /> } : null);

  if (!activeContent) return <NavPanelDrawerAnchor />;

  return (
    <>
      <NavPanelDraggable activeContent={activeContent} />
      <NavPanelDrawerAnchor />
    </>
  );
});

export default NavPanel;

interface NavPanelPortalProps extends PropsWithChildren {
  /**
   * Unique key to trigger transition animation when content changes
   * @example <NavPanelPortal navKey="chat">...</NavPanelPortal>
   */
  navKey?: string;
}

export const NavPanelPortal = memo<NavPanelPortalProps>(({ children, navKey = 'default' }) => {
  useLayoutEffect(() => {
    if (!children) return;

    setNavPanelSnapshot({
      key: navKey,
      node: children,
    });

    return () => {
      if (currentSnapshot?.key === navKey) setNavPanelSnapshot(null);
    };
  }, [children, navKey]);

  return null;
});
