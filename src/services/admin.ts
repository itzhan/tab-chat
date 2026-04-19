import { lambdaClient } from '@/libs/trpc/client';

type PlanInput = {
  id: string;
  name: string;
  description?: string | null;
  storageQuotaBytes: number;
  isDefault?: boolean;
  enabled?: boolean;
  sortOrder?: number;
};

export class AdminService {
  // plans
  listPlans = () => lambdaClient.adminPlans.list.query();
  createPlan = (input: PlanInput) => lambdaClient.adminPlans.create.mutate(input);
  updatePlan = (input: Partial<PlanInput> & { id: string }) =>
    lambdaClient.adminPlans.update.mutate(input);
  deletePlan = (id: string) => lambdaClient.adminPlans.delete.mutate({ id });
  listModelQuotas = (planId: string) => lambdaClient.adminPlans.listModelQuotas.query({ planId });
  upsertModelQuota = (input: {
    planId: string;
    providerId: string;
    modelId: string;
    monthlyLimit: number;
  }) => lambdaClient.adminPlans.upsertModelQuota.mutate(input);
  deleteModelQuota = (input: { planId: string; providerId: string; modelId: string }) =>
    lambdaClient.adminPlans.deleteModelQuota.mutate(input);

  // users
  listUsers = () => lambdaClient.adminUsers.list.query();
  getUsage = (userId: string) => lambdaClient.adminUsers.getUsage.query({ userId });
  updateSubscription = (input: { userId: string; planId: string; expireAt?: string | null }) =>
    lambdaClient.adminUsers.updateSubscription.mutate(input);
  setRole = (input: { userId: string; role: 'admin' | 'user' }) =>
    lambdaClient.adminUsers.setRole.mutate(input);
  setBan = (input: { userId: string; banned: boolean; reason?: string }) =>
    lambdaClient.adminUsers.setBan.mutate(input);
  getUserDetail = (userId: string) => lambdaClient.adminUsers.getDetail.query({ userId });

  // app settings
  getSidebarAllowlist = () => lambdaClient.adminAppSettings.getSidebarAllowlist.query();
  setSidebarAllowlist = (items: string[]) =>
    lambdaClient.adminAppSettings.setSidebarAllowlist.mutate({ items });
  getMySidebarAllowlist = () => lambdaClient.adminAppSettings.getMySidebarAllowlist.query();
  getAllowUsersClientFetch = () => lambdaClient.adminAppSettings.getAllowUsersClientFetch.query();
  setAllowUsersClientFetch = (enabled: boolean) =>
    lambdaClient.adminAppSettings.setAllowUsersClientFetch.mutate({ enabled });

  // builtin skill allowlist
  getBuiltinSkillAllowlist = () => lambdaClient.adminAppSettings.getBuiltinSkillAllowlist.query();
  setBuiltinSkillAllowlist = (items: string[]) =>
    lambdaClient.adminAppSettings.setBuiltinSkillAllowlist.mutate({ items });
  getMyBuiltinSkillAllowlist = () =>
    lambdaClient.adminAppSettings.getMyBuiltinSkillAllowlist.query();

  // global plugin list — curated by admin, exposed to every user
  getGlobalPluginList = () => lambdaClient.adminAppSettings.getGlobalPluginList.query();
  setGlobalPluginList = (
    items: Array<{
      identifier: string;
      type: 'mcp' | 'skill';
      displayTitle?: string;
      displayDescription?: string;
      manifest?: any;
    }>,
  ) => lambdaClient.adminAppSettings.setGlobalPluginList.mutate({ items });
  getMyGlobalPluginList = () => lambdaClient.adminAppSettings.getMyGlobalPluginList.query();

  // builtin skill overrides
  getBuiltinSkillOverrides = () => lambdaClient.adminAppSettings.getBuiltinSkillOverrides.query();
  setBuiltinSkillOverrides = (
    overrides: Record<string, { title?: string; description?: string }>,
  ) => lambdaClient.adminAppSettings.setBuiltinSkillOverrides.mutate({ overrides });
  getMyBuiltinSkillOverrides = () =>
    lambdaClient.adminAppSettings.getMyBuiltinSkillOverrides.query();

  // boost pack templates
  getBoostPackTemplates = () => lambdaClient.adminAppSettings.getBoostPackTemplates.query();
  setBoostPackTemplates = (
    items: Array<{
      id: string;
      name: string;
      description?: string;
      enabled: boolean;
      sortOrder: number;
      models: Array<{ providerId: string; modelId: string }>;
      quotaPerUnit: number;
      pricingTiers: Array<{ quantity: number; price: number; label?: string }>;
    }>,
  ) => lambdaClient.adminAppSettings.setBoostPackTemplates.mutate({ items });
  getMyBoostPackTemplates = () => lambdaClient.adminAppSettings.getMyBoostPackTemplates.query();

  // boost packs
  listBoostPacks = () => lambdaClient.adminBoostPacks.list.query();
  grantBoostPack = (input: {
    userId: string;
    providerId: string;
    modelId: string;
    remainingCount: number;
    grantedReason?: string;
    expireAt?: string | null;
  }) => lambdaClient.adminBoostPacks.grant.mutate(input);
  grantBoostPackFromTemplate = (input: {
    userId: string;
    templateId: string;
    quantity: number;
    grantedReason?: string;
    expireAt?: string | null;
  }) => lambdaClient.adminBoostPacks.grantFromTemplate.mutate(input);
  revokeBoostPack = (id: string) => lambdaClient.adminBoostPacks.revoke.mutate({ id });
}

export const adminService = new AdminService();
