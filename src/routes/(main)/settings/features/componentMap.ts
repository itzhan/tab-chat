import { createElement } from 'react';

import Loading from '@/components/Loading/BrandTextLoading';
import dynamic from '@/libs/next/dynamic';
import { SettingsTabs } from '@/store/global/initialState';

const loading = (debugId: string) => () => createElement(Loading, { debugId });

export const componentMap = {
  [SettingsTabs.Advanced]: dynamic(() => import('../advanced'), {
    loading: loading('Settings > Advanced'),
  }),
  [SettingsTabs.Appearance]: dynamic(() => import('../appearance'), {
    loading: loading('Settings > Appearance'),
  }),
  [SettingsTabs.Provider]: dynamic(() => import('../provider'), {
    loading: loading('Settings > Provider'),
  }),
  [SettingsTabs.ServiceModel]: dynamic(() => import('../service-model'), {
    loading: loading('Settings > ServiceModel'),
  }),
  [SettingsTabs.Memory]: dynamic(() => import('../memory'), {
    loading: loading('Settings > Memory'),
  }),
  [SettingsTabs.Notification]: dynamic(
    () => import('@/business/client/BusinessSettingPages/Notification'),
    {
      loading: loading('Settings > Notification'),
    },
  ),
  [SettingsTabs.About]: dynamic(() => import('../about'), {
    loading: loading('Settings > About'),
  }),
  [SettingsTabs.Hotkey]: dynamic(() => import('../hotkey'), {
    loading: loading('Settings > Hotkey'),
  }),
  [SettingsTabs.Proxy]: dynamic(() => import('../proxy'), {
    loading: loading('Settings > Proxy'),
  }),
  [SettingsTabs.SystemTools]: dynamic(() => import('../system-tools'), {
    loading: loading('Settings > SystemTools'),
  }),
  [SettingsTabs.Storage]: dynamic(() => import('../storage'), {
    loading: loading('Settings > Storage'),
  }),
  // Profile related tabs
  [SettingsTabs.Profile]: dynamic(() => import('../profile'), {
    loading: loading('Settings > Profile'),
  }),
  [SettingsTabs.Stats]: dynamic(() => import('../stats'), {
    loading: loading('Settings > Stats'),
  }),
  [SettingsTabs.Usage]: dynamic(() => import('@/business/client/BusinessSettingPages/Usage'), {
    loading: loading('Settings > Usage'),
  }),
  [SettingsTabs.APIKey]: dynamic(() => import('../apikey'), {
    loading: loading('Settings > APIKey'),
  }),
  [SettingsTabs.Creds]: dynamic(() => import('../creds'), {
    loading: loading('Settings > Creds'),
  }),
  [SettingsTabs.Security]: dynamic(() => import('../security'), {
    loading: loading('Settings > Security'),
  }),
  [SettingsTabs.Skill]: dynamic(() => import('../skill'), {
    loading: loading('Settings > Skill'),
  }),

  [SettingsTabs.MySubscription]: dynamic(() => import('../my-subscription'), {
    loading: loading('Settings > MySubscription'),
  }),

  [SettingsTabs.Plans]: dynamic(() => import('@/business/client/BusinessSettingPages/Plans'), {
    loading: loading('Settings > Plans'),
  }),
  [SettingsTabs.Credits]: dynamic(() => import('@/business/client/BusinessSettingPages/Credits'), {
    loading: loading('Settings > Credits'),
  }),
  [SettingsTabs.Billing]: dynamic(() => import('@/business/client/BusinessSettingPages/Billing'), {
    loading: loading('Settings > Billing'),
  }),
  [SettingsTabs.Referral]: dynamic(
    () => import('@/business/client/BusinessSettingPages/Referral'),
    {
      loading: loading('Settings > Referral'),
    },
  ),

  // Admin-only pages (exposed inside Settings when user.isAdmin)
  [SettingsTabs.AdminPlans]: dynamic(() => import('@/features/AdminConsole/Plans'), {
    loading: loading('Settings > Admin > Plans'),
  }),
  [SettingsTabs.AdminUsers]: dynamic(() => import('@/features/AdminConsole/Users'), {
    loading: loading('Settings > Admin > Users'),
  }),
  [SettingsTabs.AdminBoostPacks]: dynamic(() => import('@/features/AdminConsole/BoostPacks'), {
    loading: loading('Settings > Admin > BoostPacks'),
  }),
  [SettingsTabs.AdminBoostPackTemplates]: dynamic(
    () => import('@/features/AdminConsole/BoostPackTemplates'),
    { loading: loading('Settings > Admin > BoostPackTemplates') },
  ),
  [SettingsTabs.AdminSidebar]: dynamic(() => import('@/features/AdminConsole/Sidebar'), {
    loading: loading('Settings > Admin > Sidebar'),
  }),
  [SettingsTabs.AdminSkills]: dynamic(() => import('@/features/AdminConsole/Skills'), {
    loading: loading('Settings > Admin > Skills'),
  }),
  [SettingsTabs.AdminAdmins]: dynamic(() => import('@/features/AdminConsole/Admins'), {
    loading: loading('Settings > Admin > Admins'),
  }),
};
