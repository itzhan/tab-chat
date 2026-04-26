import Billing from '@/business/client/BusinessSettingPages/Billing';
import Credits from '@/business/client/BusinessSettingPages/Credits';
import Notification from '@/business/client/BusinessSettingPages/Notification';
import Plans from '@/business/client/BusinessSettingPages/Plans';
import Referral from '@/business/client/BusinessSettingPages/Referral';
import Usage from '@/business/client/BusinessSettingPages/Usage';
import AdminAdmins from '@/features/AdminConsole/Admins';
import AdminBoostPacks from '@/features/AdminConsole/BoostPacks';
import AdminBoostPackTemplates from '@/features/AdminConsole/BoostPackTemplates';
import AdminPlans from '@/features/AdminConsole/Plans';
import AdminSidebar from '@/features/AdminConsole/Sidebar';
import AdminSkills from '@/features/AdminConsole/Skills';
import AdminUsers from '@/features/AdminConsole/Users';
import { SettingsTabs } from '@/store/global/initialState';

import About from '../about';
import Advanced from '../advanced';
import APIKey from '../apikey';
import Appearance from '../appearance';
import Creds from '../creds';
import Hotkey from '../hotkey';
import Memory from '../memory';
import MySubscription from '../my-subscription';
import Profile from '../profile';
import Provider from '../provider';
import Proxy from '../proxy';
import Security from '../security';
import ServiceModel from '../service-model';
import Skill from '../skill';
import Stats from '../stats';
import Storage from '../storage';
import SystemTools from '../system-tools';

export const componentMap = {
  [SettingsTabs.Advanced]: Advanced,
  [SettingsTabs.Appearance]: Appearance,
  [SettingsTabs.Provider]: Provider,
  [SettingsTabs.ServiceModel]: ServiceModel,
  [SettingsTabs.Memory]: Memory,
  [SettingsTabs.Notification]: Notification,
  [SettingsTabs.About]: About,
  [SettingsTabs.Hotkey]: Hotkey,
  [SettingsTabs.Proxy]: Proxy,
  [SettingsTabs.SystemTools]: SystemTools,
  [SettingsTabs.Storage]: Storage,
  // Profile related tabs
  [SettingsTabs.Profile]: Profile,
  [SettingsTabs.Stats]: Stats,
  [SettingsTabs.Usage]: Usage,
  [SettingsTabs.APIKey]: APIKey,
  [SettingsTabs.Creds]: Creds,
  [SettingsTabs.Security]: Security,
  [SettingsTabs.Skill]: Skill,

  [SettingsTabs.MySubscription]: MySubscription,

  [SettingsTabs.Plans]: Plans,
  [SettingsTabs.Credits]: Credits,
  [SettingsTabs.Billing]: Billing,
  [SettingsTabs.Referral]: Referral,

  // Admin-only pages (exposed inside Settings when user.isAdmin)
  [SettingsTabs.AdminPlans]: AdminPlans,
  [SettingsTabs.AdminUsers]: AdminUsers,
  [SettingsTabs.AdminBoostPacks]: AdminBoostPacks,
  [SettingsTabs.AdminBoostPackTemplates]: AdminBoostPackTemplates,
  [SettingsTabs.AdminSidebar]: AdminSidebar,
  [SettingsTabs.AdminSkills]: AdminSkills,
  [SettingsTabs.AdminAdmins]: AdminAdmins,
};
