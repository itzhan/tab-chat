import { eq } from 'drizzle-orm';

import { appSettings } from '../schemas';
import type { LobeChatDatabase } from '../type';

export const SIDEBAR_ALLOWLIST_KEY = 'sidebar_allowlist';
export const ALLOW_USERS_CLIENT_FETCH_KEY = 'allow_users_client_fetch';
export const BUILTIN_SKILL_ALLOWLIST_KEY = 'builtin_skill_allowlist';
export const BUILTIN_SKILL_OVERRIDES_KEY = 'builtin_skill_overrides';
export const GLOBAL_PLUGIN_LIST_KEY = 'global_plugin_list';
export const BOOST_PACK_TEMPLATES_KEY = 'boost_pack_templates';

export interface BoostPackTemplate {
  description?: string;
  enabled: boolean;
  id: string;
  /** Group of models sharing the pack's remaining count */
  models: Array<{ providerId: string; modelId: string }>;
  name: string;
  /** Volume-discount tiers */
  pricingTiers: Array<{
    quantity: number;
    price: number;
    /** Optional label, e.g. "推荐" */
    label?: string;
  }>;
  /** Messages granted per single "unit" purchase */
  quotaPerUnit: number;
  sortOrder: number;
}

/** Admin can rename / re-describe a builtin skill to fit their brand / user vocabulary. */
export type BuiltinSkillOverrides = Record<string, { title?: string; description?: string }>;

export interface GlobalPluginEntry {
  /** Admin-overridden display description; falls back to market manifest description */
  displayDescription?: string;
  /** Admin-overridden display title; falls back to market manifest title */
  displayTitle?: string;
  /** Source identifier (market slug for mcp/skill) */
  identifier: string;
  /** Manifest snapshot fetched from market at add-time — required for runtime invocation */
  manifest?: any;
  /** Type helps client render the right icon / fetch the right manifest */
  type: 'mcp' | 'skill';
}
export const DEFAULT_SIDEBAR_ALLOWLIST: string[] = [
  'pages',
  'recents',
  'agent',
  'community',
  'resource',
  'memory',
];

export class AppSettingsModel {
  constructor(private db: LobeChatDatabase) {}

  get = async <T = unknown>(key: string): Promise<T | undefined> => {
    const row = await this.db.query.appSettings.findFirst({ where: eq(appSettings.key, key) });
    return row?.value as T | undefined;
  };

  set = async <T>(key: string, value: T): Promise<void> => {
    await this.db
      .insert(appSettings)
      .values({ key, value: value as any })
      .onConflictDoUpdate({ set: { value: value as any }, target: appSettings.key });
  };

  getSidebarAllowlist = async (): Promise<string[]> => {
    const value = await this.get<string[]>(SIDEBAR_ALLOWLIST_KEY);
    return Array.isArray(value) ? value : DEFAULT_SIDEBAR_ALLOWLIST;
  };

  setSidebarAllowlist = (value: string[]) => this.set(SIDEBAR_ALLOWLIST_KEY, value);

  getAllowUsersClientFetch = async (): Promise<boolean> => {
    const value = await this.get<boolean>(ALLOW_USERS_CLIENT_FETCH_KEY);
    return value === true;
  };

  setAllowUsersClientFetch = (value: boolean) => this.set(ALLOW_USERS_CLIENT_FETCH_KEY, value);

  /**
   * Returns the admin-managed list of builtin skill identifiers that are exposed to users.
   * If undefined (never configured), returns `null` to signal "show all by default".
   */
  getBuiltinSkillAllowlist = async (): Promise<string[] | null> => {
    const value = await this.get<string[]>(BUILTIN_SKILL_ALLOWLIST_KEY);
    return Array.isArray(value) ? value : null;
  };

  setBuiltinSkillAllowlist = (value: string[]) => this.set(BUILTIN_SKILL_ALLOWLIST_KEY, value);

  /**
   * Admin-curated global plugin list — users can use these without installing.
   * Empty array = nothing curated yet. Admins own the list.
   */
  getGlobalPluginList = async (): Promise<GlobalPluginEntry[]> => {
    const value = await this.get<GlobalPluginEntry[]>(GLOBAL_PLUGIN_LIST_KEY);
    return Array.isArray(value) ? value : [];
  };

  setGlobalPluginList = (value: GlobalPluginEntry[]) => this.set(GLOBAL_PLUGIN_LIST_KEY, value);

  getBuiltinSkillOverrides = async (): Promise<BuiltinSkillOverrides> => {
    const value = await this.get<BuiltinSkillOverrides>(BUILTIN_SKILL_OVERRIDES_KEY);
    return value && typeof value === 'object' ? value : {};
  };

  setBuiltinSkillOverrides = (value: BuiltinSkillOverrides) =>
    this.set(BUILTIN_SKILL_OVERRIDES_KEY, value);

  getBoostPackTemplates = async (): Promise<BoostPackTemplate[]> => {
    const value = await this.get<BoostPackTemplate[]>(BOOST_PACK_TEMPLATES_KEY);
    return Array.isArray(value) ? value : [];
  };

  setBoostPackTemplates = (value: BoostPackTemplate[]) => this.set(BOOST_PACK_TEMPLATES_KEY, value);
}
