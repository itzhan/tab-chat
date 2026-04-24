import { DEFAULT_LANG } from '@/const/locale';

import type resources from './default';

export const locales = ['en-US', 'zh-CN'] as const;

export type DefaultResources = typeof resources;
export type NS = keyof DefaultResources;
export type Locales = (typeof locales)[number];

export const normalizeLocale = (locale?: string): Locales => {
  if (!locale) return DEFAULT_LANG;

  if (locale.startsWith('cn') || locale.startsWith('zh')) return 'zh-CN';
  if (locale.startsWith('en')) return 'en-US';

  return DEFAULT_LANG;
};

type LocaleOptions = {
  label: string;
  value: Locales;
}[];

export const localeOptions: LocaleOptions = [
  {
    label: 'English',
    value: 'en-US',
  },
  {
    label: '简体中文',
    value: 'zh-CN',
  },
] as LocaleOptions;

export const supportLocales: string[] = [...locales, 'en', 'zh'];
