import { isDesktop } from '@lobechat/const';
import { Avatar } from '@lobehub/ui';
import { SkillsIcon } from '@lobehub/ui/icons';
import {
  // BellIcon,
  Brain,
  BrainCircuit,
  ChartColumnBigIcon,
  Coins,
  CreditCard,
  CrownIcon,
  Database,
  EllipsisIcon,
  EthernetPort,
  Gift,
  Info,
  KeyboardIcon,
  KeyIcon,
  KeyRound,
  Layout,
  Map,
  Package,
  PaletteIcon,
  Rocket,
  Sparkles,
  TerminalSquare,
  UserCog,
  Users,
} from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { useElectronStore } from '@/store/electron';
import { electronSyncSelectors } from '@/store/electron/selectors';
import { SettingsTabs } from '@/store/global/initialState';
import {
  featureFlagsSelectors,
  serverConfigSelectors,
  useServerConfigStore,
} from '@/store/serverConfig';
import { useUserStore } from '@/store/user';
import { userProfileSelectors } from '@/store/user/slices/auth/selectors';
import { userGeneralSettingsSelectors } from '@/store/user/slices/settings/selectors';

export enum SettingsGroupKey {
  Admin = 'admin',
  Agent = 'agent',
  General = 'general',
  Subscription = 'subscription',
  System = 'system',
}

export interface CategoryItem {
  icon: any;
  key: SettingsTabs;
  label: string;
}

export interface CategoryGroup {
  items: CategoryItem[];
  key: SettingsGroupKey;
  title: string;
}

export const useCategory = () => {
  const { t } = useTranslation('setting');
  const { t: tAuth } = useTranslation('auth');
  const { t: tSubscription } = useTranslation('subscription');
  const mobile = useServerConfigStore((s) => s.isMobile);
  const { hideDocs, showApiKeyManage } = useServerConfigStore(featureFlagsSelectors);
  const [avatar, username, isAdmin] = useUserStore((s) => [
    userProfileSelectors.userAvatar(s),
    userProfileSelectors.nickName(s),
    userProfileSelectors.isAdmin(s),
  ]);
  const remoteServerUrl = useElectronStore(electronSyncSelectors.remoteServerUrl);
  const isDevMode = useUserStore((s) => userGeneralSettingsSelectors.config(s).isDevMode);

  const avatarUrl = useMemo(() => {
    if (!avatar) return undefined;
    if (isDesktop && avatar.startsWith('/') && remoteServerUrl) {
      return remoteServerUrl + avatar;
    }
    return avatar;
  }, [avatar, remoteServerUrl]);
  const enableBusinessFeatures = useServerConfigStore(serverConfigSelectors.enableBusinessFeatures);
  const categoryGroups: CategoryGroup[] = useMemo(() => {
    const groups: CategoryGroup[] = [];

    // General group
    const generalItems: CategoryItem[] = [
      {
        icon: avatarUrl ? <Avatar avatar={avatarUrl} shape={'square'} size={26} /> : undefined,
        key: SettingsTabs.Profile,
        label: username ? username : tAuth('tab.profile'),
      },
      {
        icon: ChartColumnBigIcon,
        key: SettingsTabs.Stats,
        label: tAuth('tab.stats'),
      },
      {
        icon: PaletteIcon,
        key: SettingsTabs.Appearance,
        label: t('tab.appearance'),
      },
      {
        icon: CrownIcon,
        key: SettingsTabs.MySubscription,
        label: '我的会员',
      },
      !mobile && {
        icon: KeyboardIcon,
        key: SettingsTabs.Hotkey,
        label: t('tab.hotkey'),
      },
      // TODO: temporarily disabled until notification UI is polished
      // enableBusinessFeatures && {
      //   icon: BellIcon,
      //   key: SettingsTabs.Notification,
      //   label: t('tab.notification'),
      // },
    ].filter(Boolean) as CategoryItem[];

    groups.push({
      items: generalItems,
      key: SettingsGroupKey.General,
      title: t('group.common'),
    });

    // Subscription group
    if (enableBusinessFeatures) {
      const subscriptionItems: CategoryItem[] = [
        { icon: Map, key: SettingsTabs.Plans, label: tSubscription('tab.plans') },
        { icon: ChartColumnBigIcon, key: SettingsTabs.Usage, label: t('tab.usage') },
        { icon: Coins, key: SettingsTabs.Credits, label: tSubscription('tab.credits') },
        { icon: CreditCard, key: SettingsTabs.Billing, label: tSubscription('tab.billing') },
        { icon: Gift, key: SettingsTabs.Referral, label: tSubscription('tab.referral') },
      ];

      groups.push({
        items: subscriptionItems,
        key: SettingsGroupKey.Subscription,
        title: t('group.subscription'),
      });
    }

    // Agent group:
    //   - admins see the full set (providers/models/skills/memory/creds/api-key)
    //   - non-admins see ONLY "AI 服务商" so they can enter BYO key management
    //     for providers the admin has opened up. Models/skills/creds etc. are
    //     still admin-only since users can't configure those.
    if (isAdmin) {
      const agentItems: CategoryItem[] = [
        (!enableBusinessFeatures || isDevMode) && {
          icon: Brain,
          key: SettingsTabs.Provider,
          label: t('tab.provider'),
        },
        {
          icon: Sparkles,
          key: SettingsTabs.ServiceModel,
          label: t('tab.serviceModel'),
        },
        {
          icon: SkillsIcon,
          key: SettingsTabs.Skill,
          label: t('tab.skill'),
        },
        {
          icon: BrainCircuit,
          key: SettingsTabs.Memory,
          label: t('tab.memory'),
        },
        {
          icon: KeyRound,
          key: SettingsTabs.Creds,
          label: t('tab.creds'),
        },
        showApiKeyManage && {
          icon: KeyIcon,
          key: SettingsTabs.APIKey,
          label: tAuth('tab.apikey'),
        },
      ].filter(Boolean) as CategoryItem[];

      groups.push({
        items: agentItems,
        key: SettingsGroupKey.Agent,
        title: t('group.aiConfig'),
      });
    } else {
      groups.push({
        items: [
          {
            icon: Brain,
            key: SettingsTabs.Provider,
            label: t('tab.provider'),
          },
        ],
        key: SettingsGroupKey.Agent,
        title: t('group.aiConfig'),
      });
    }

    // System group (admin only)
    if (isAdmin) {
      const systemItems: CategoryItem[] = [
        isDesktop && {
          icon: EthernetPort,
          key: SettingsTabs.Proxy,
          label: t('tab.proxy'),
        },
        isDesktop && {
          icon: TerminalSquare,
          key: SettingsTabs.SystemTools,
          label: t('tab.systemTools'),
        },
        {
          icon: Database,
          key: SettingsTabs.Storage,
          label: t('tab.storage'),
        },
        isDevMode && {
          icon: KeyIcon,
          key: SettingsTabs.APIKey,
          label: tAuth('tab.apikey'),
        },
        {
          icon: EllipsisIcon,
          key: SettingsTabs.Advanced,
          label: t('tab.advanced'),
        },
        !hideDocs && {
          icon: Info,
          key: SettingsTabs.About,
          label: t('tab.about'),
        },
      ].filter(Boolean) as CategoryItem[];

      groups.push({
        items: systemItems,
        key: SettingsGroupKey.System,
        title: t('group.system'),
      });
    }

    // Admin group — shown inline in Settings for admin users
    if (isAdmin) {
      const adminItems: CategoryItem[] = [
        { icon: Package, key: SettingsTabs.AdminPlans, label: '套餐管理' },
        { icon: Rocket, key: SettingsTabs.AdminBoostPackTemplates, label: '加油包管理' },
        { icon: Users, key: SettingsTabs.AdminUsers, label: '用户管理' },
        { icon: Rocket, key: SettingsTabs.AdminBoostPacks, label: '加油包发放' },
        { icon: Layout, key: SettingsTabs.AdminSidebar, label: '侧栏菜单' },
        { icon: Sparkles, key: SettingsTabs.AdminSkills, label: '技能开放' },
        { icon: UserCog, key: SettingsTabs.AdminAdmins, label: '管理员' },
      ];

      groups.push({
        items: adminItems,
        key: SettingsGroupKey.Admin,
        title: '后台管理',
      });
    }

    return groups;
  }, [
    t,
    tAuth,
    tSubscription,
    enableBusinessFeatures,
    hideDocs,
    mobile,
    showApiKeyManage,
    isDevMode,
    avatarUrl,
    username,
    isAdmin,
  ]);

  return categoryGroups;
};
