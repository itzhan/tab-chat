import { lambdaClient } from '@/libs/trpc/client';

export class SubscriptionService {
  me = () => lambdaClient.subscription.me.query();
  myUsage = () => lambdaClient.subscription.myUsage.query();
  myBoostPacks = () => lambdaClient.subscription.myBoostPacks.query();
  myModelQuota = (providerId: string, modelId: string) =>
    lambdaClient.subscription.myModelQuota.query({ providerId, modelId });
  myModelQuotaBatch = (items: Array<{ providerId: string; modelId: string }>) =>
    lambdaClient.subscription.myModelQuotaBatch.query({ items });
  listPlans = () => lambdaClient.subscription.listPlans.query();
  requestUpgrade = (planId: string, note?: string) =>
    lambdaClient.subscription.requestUpgrade.mutate({ note, planId });
  requestBoostPurchase = (templateId: string, quantity: number, note?: string) =>
    lambdaClient.subscription.requestBoostPurchase.mutate({ note, quantity, templateId });
  getMyBoostPackTemplates = () => lambdaClient.adminAppSettings.getMyBoostPackTemplates.query();
  recordClientSideUsage = (providerId: string, modelId: string) =>
    lambdaClient.subscription.recordClientSideUsage.mutate({ modelId, providerId });
}

export const subscriptionService = new SubscriptionService();
