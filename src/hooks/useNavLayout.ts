import { MessageSquare } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { getRouteById } from '@/config/routes';
import { SidebarTabKey } from '@/store/global/initialState';

export interface NavItem {
  hidden?: boolean;
  icon: any;
  isNew?: boolean;
  key: string;
  onClick?: () => void;
  title: string;
  url?: string;
}

export interface NavLayout {
  bottomMenuItems: NavItem[];
  footer: {
    hideGitHub: boolean;
    layout: 'expanded' | 'compact';
    showEvalEntry: boolean;
    showSettingsEntry: boolean;
  };
  topNavItems: NavItem[];
  userPanel: {
    showDataImporter: boolean;
    showMemory: boolean;
  };
}

export const useNavLayout = (): NavLayout => {
  const { t } = useTranslation('common');

  const topNavItems = useMemo(
    () =>
      [
        {
          icon: MessageSquare,
          key: SidebarTabKey.Chat,
          title: t('tab.chat'),
          url: '/',
        },
        {
          icon: getRouteById('image')!.icon,
          key: SidebarTabKey.Image,
          title: t('tab.image'),
          url: '/image',
        },
        {
          icon: getRouteById('video')!.icon,
          key: SidebarTabKey.Video,
          title: t('tab.video'),
          url: '/video',
        },
        {
          icon: getRouteById('resource')!.icon,
          key: SidebarTabKey.Resource,
          title: t('tab.resource'),
          url: '/resource',
        },
        {
          icon: getRouteById('community')!.icon,
          key: SidebarTabKey.Community,
          title: t('tab.community'),
          url: '/community',
        },
        {
          icon: getRouteById('membership')!.icon,
          key: SidebarTabKey.Membership,
          title: t('tab.membership' as any),
          url: '/membership',
        },
      ] as NavItem[],
    [t],
  );

  const bottomMenuItems = useMemo(() => [] as NavItem[], []);

  const footer = useMemo(
    () => ({
      hideGitHub: true,
      layout: 'compact' as const,
      showEvalEntry: false,
      showSettingsEntry: true,
    }),
    [],
  );

  const userPanel = useMemo(
    () => ({
      showDataImporter: false,
      showMemory: true,
    }),
    [],
  );

  return { bottomMenuItems, footer, topNavItems, userPanel };
};
