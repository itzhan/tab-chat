import react from '@vitejs/plugin-react';
import { codeInspectorPlugin } from 'code-inspector-plugin';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import tsconfigPaths from 'vite-tsconfig-paths';

import { viteEmotionSpeedy } from './emotionSpeedy';
import { viteMarkdownImport } from './markdownImport';
import { viteNodeModuleStub } from './nodeModuleStub';
import { vitePlatformResolve } from './platformResolve';

/**
 * Shared manualChunks — groups leaf-node modules to reduce chunk file count.
 * Only targets pure data modules (no downstream dependents) to avoid facade chunk issues.
 */
/** Large i18n namespaces that get their own per-locale chunk instead of merging into the locale bundle */
const HEAVY_NS = new Set(['models', 'modelProvider']);

/** antd locale filename → app locale */
const ANTD_LOCALE: Record<string, string> = {
  en_US: 'en-US',
  zh_CN: 'zh-CN',
};

/** dayjs locale filename → app locale */
const DAYJS_LOCALE: Record<string, string> = {
  'en': 'en-US',
  'zh-cn': 'zh-CN',
};

/**
 * Aggressive vendor chunking for web deployment.
 *
 * Why: the default Vite chunking + LobeHub's desktop-first bundle produces a 9MB main
 * chunk (all UI libs + heavy editors + markdown pipeline all merged together). On a web
 * deployment over long-haul network, that's an instant 10+ second TTI.
 *
 * Strategy:
 * - Carve out ONLY leaf-ish third-party libs (no app code here) into their own chunks.
 * - Keep related libs together so a single parsed chunk gives a working feature
 *   (e.g. all lexical/codemirror go in `vendor-editor` together).
 * - Chunks too small (< ~30KB) are a net loss (RTT cost), so a handful of big ones
 *   beats hundreds of tiny ones.
 *
 * IMPORTANT: never group app code or `model-bank` here — doing so creates facade
 * chunks and circular-dep init crashes. Only node_modules.
 */
function sharedManualChunks(id: string): string | undefined {
  // i18n locale JSON/TS files
  const localeMatch = id.match(/\/locales\/([^/]+)\/([^/.]+)/);
  if (localeMatch) {
    const [, locale, ns] = localeMatch;
    if (locale === 'default') return 'i18n-default';
    if (HEAVY_NS.has(ns)) return `i18n-${locale}-${ns}`;
    return `i18n-${locale}`;
  }

  // model-bank (monorepo package — split before node_modules guard)
  if (id.includes('model-bank')) return 'providerConfig';

  if (!id.includes('node_modules')) return;

  // Normalize path to make matches simpler — look at the `node_modules/...` tail.
  const nm = id.slice(id.lastIndexOf('node_modules/') + 'node_modules/'.length);

  // antd locale → merge into i18n-{locale}
  const antdMatch = id.match(/antd\/es\/locale\/([^/.]+)\.js/);
  if (antdMatch) {
    const locale = ANTD_LOCALE[antdMatch[1]];
    if (locale) return `i18n-${locale}`;
  }

  // dayjs locale → merge into i18n-{locale}
  const dayjsMatch = id.match(/dayjs\/locale\/([^/.]+)\.js/);
  if (dayjsMatch) {
    const locale = DAYJS_LOCALE[dayjsMatch[1]];
    if (locale) return `i18n-${locale}`;
  }

  // ───── React core (critical, loaded on every page, cache forever) ─────
  if (nm.startsWith('react/') || nm.startsWith('react-dom/') || nm.startsWith('scheduler/')) {
    return 'vendor-react';
  }
  if (nm.startsWith('react-router/') || nm.startsWith('react-router-dom/')) {
    return 'vendor-react-router';
  }

  // ───── UI libraries ─────
  // INTENTIONALLY NOT CHUNKED: @lobehub/ui, antd, antd-style, rc-*, @ant-design/*.
  // These are imported at module top-level across 250+ app files — @lobehub/ui
  // components are referenced in module scope for static props, and more
  // importantly `antd-style`'s `createStyles` / `createStaticStyles` are called
  // at module load time in every styled component. Pinning them into a fixed
  // vendor chunk creates an init cycle between the app chunk and the vendor
  // chunk that surfaces as TDZ errors in minified code ("Ne is not a function",
  // "Cannot access 'Ir' before initialization"). Same family as the
  // zustand-utils issue. Let Rollup's default splitter handle them.
  //
  // Icons are leaf libraries (only referenced inside JSX, never at module top),
  // so they're still safe to group.
  if (nm.startsWith('@lobehub/icons/')) return 'vendor-lobehub-icons';

  // ───── Heavy feature libs: only load when feature is used ─────
  // Editor stack (Lexical + LobeHub editor + code editors)
  if (
    nm.startsWith('@lobehub/editor/') ||
    nm.startsWith('lexical/') ||
    nm.startsWith('@lexical/')
  ) {
    return 'vendor-editor-lexical';
  }
  if (nm.startsWith('@codemirror/') || nm.startsWith('codemirror/')) {
    return 'vendor-editor-codemirror';
  }
  if (nm.startsWith('@codesandbox/sandpack-react/')) return 'vendor-sandpack';

  // Markdown pipeline (react-markdown + remark/rehype + shiki for code blocks)
  if (
    nm.startsWith('react-markdown/') ||
    nm.startsWith('remark-') ||
    nm.startsWith('rehype-') ||
    nm.startsWith('marked/') ||
    nm.startsWith('mdast-') ||
    nm.startsWith('unified/') ||
    nm.startsWith('micromark') ||
    nm.startsWith('hast-') ||
    nm.startsWith('unist-')
  ) {
    return 'vendor-markdown';
  }
  // NOTE: don't manualChunk shiki. It pulls ~15MB of grammar/theme source; forcing it
  // into a single chunk yields a 19MB file that PWA workbox rejects and browsers can't
  // stream efficiently. Leave it to rollup's default splitting (one chunk per language/
  // theme), which is what shiki was designed for.

  // PDF (huge, only for file viewer)
  if (nm.startsWith('pdfjs-dist/') || nm.startsWith('react-pdf/') || nm.startsWith('@react-pdf/')) {
    return 'vendor-pdf';
  }
  if (nm.startsWith('pdfkit/')) return 'vendor-pdfkit';

  // 3D tag cloud
  if (nm.startsWith('three/') || nm.startsWith('@react-three/')) {
    return 'vendor-three';
  }

  // Diagrams
  if (nm.startsWith('mermaid/')) return 'vendor-mermaid';
  if (nm.startsWith('@lobehub/charts/')) return 'vendor-charts';

  // TTS / Audio
  if (nm.startsWith('@lobehub/tts/')) return 'vendor-tts';

  // Drag & drop
  if (nm.startsWith('@dnd-kit/') || nm.startsWith('@atlaskit/pragmatic-drag-and-drop')) {
    return 'vendor-dnd';
  }

  // Terminal (xterm)
  if (nm.startsWith('@xterm/')) return 'vendor-xterm';

  // Analytics / telemetry
  if (
    nm.startsWith('@lobehub/analytics/') ||
    nm.startsWith('posthog-js/') ||
    nm.startsWith('@vercel/analytics/') ||
    nm.startsWith('@vercel/speed-insights/')
  ) {
    return 'vendor-analytics';
  }

  // tRPC + React Query + state libs
  if (
    nm.startsWith('@trpc/') ||
    nm.startsWith('@tanstack/react-query/') ||
    nm.startsWith('superjson/')
  ) {
    return 'vendor-trpc';
  }

  // Better-auth
  if (
    nm.startsWith('better-auth/') ||
    nm.startsWith('@better-auth/') ||
    nm.startsWith('better-call/')
  ) {
    return 'vendor-auth';
  }

  // Editor-runtime / LobeHub market SDK / heavy LobeHub packages
  if (nm.startsWith('@lobehub/market-sdk/')) return 'vendor-market-sdk';

  // Canvas / image processing
  if (nm.startsWith('@zumer/snapdom/') || nm.startsWith('chroma-js/')) {
    return 'vendor-canvas-tools';
  }

  // Confetti / visuals
  if (nm.startsWith('react-confetti/') || nm.startsWith('react-fast-marquee/')) {
    return 'vendor-visuals';
  }

  // OGL (lighter-weight 3D used for some animated backgrounds)
  if (nm.startsWith('ogl/')) return 'vendor-ogl';

  // zod / schema validation
  if (nm.startsWith('zod/') || nm.startsWith('zod-to-json-schema/')) return 'vendor-zod';

  // Lucide icons
  if (nm.startsWith('lucide-react/')) return 'vendor-icons';

  // es-toolkit
  if (nm.startsWith('es-toolkit/')) return 'vendor-es-toolkit';

  // INTENTIONALLY NOT CHUNKED: @emotion/*. antd-style's `createStyles` /
  // `createStaticStyles` reach into emotion at module init, and since
  // antd-style itself is no longer pinned to a chunk, splitting emotion
  // separately re-creates the exact TDZ cycle we're trying to avoid.

  // motion (framer-motion)
  if (nm.startsWith('motion/') || nm.startsWith('framer-motion/')) return 'vendor-motion';

  // INTENTIONALLY NOT CHUNKED: i18next family. The global i18n instance is
  // configured at module top-level in `src/locales/create.ts` and referenced
  // by most UI files, so pinning it to a separate chunk creates the same
  // cross-chunk init cycle.

  // NOTE: do NOT manualChunk zustand / zustand-utils / swr / immer. These are
  // imported by app code all over (`store/**/store.ts`, selectors, hooks) and
  // also reach back into react/emotion internals, so grouping them into a fixed
  // `vendor-state` chunk creates an init cycle that surfaces as a TDZ error
  // ("Cannot access 'Ir' before initialization") in the minified bundle. The
  // combined gzip size is ~30KB; let Rollup's default splitter fold them into
  // whatever chunk makes sense so the init order stays correct.
}

export const sharedRollupOutput = {
  chunkFileNames: (chunkInfo: { name: string }) => {
    const { name } = chunkInfo;
    if (name.startsWith('i18n-')) return 'i18n/[name]-[hash].js';
    if (name.startsWith('vendor-')) return 'vendor/[name]-[hash].js';
    return 'assets/[name]-[hash].js';
  },
  manualChunks: sharedManualChunks,
};

type Platform = 'web' | 'mobile' | 'desktop';

const isDev = process.env.NODE_ENV !== 'production';

interface SharedRendererOptions {
  platform: Platform;
  tsconfigPaths?: boolean;
}

export function sharedRendererPlugins(options: SharedRendererOptions) {
  const defaultTsconfigPaths = options.tsconfigPaths ?? true;
  return [
    viteEmotionSpeedy(),
    viteMarkdownImport(),
    nodePolyfills({ include: ['buffer'] }),
    viteNodeModuleStub(),
    vitePlatformResolve(options.platform),
    defaultTsconfigPaths && tsconfigPaths({ projects: ['.'] }),
    isDev &&
      codeInspectorPlugin({
        bundler: 'vite',
        exclude: [/\.(css|json)$/],
        hotKeys: ['altKey', 'ctrlKey'],
      }),
    react(),
  ];
}

export function sharedRendererDefine(options: { isElectron: boolean; isMobile: boolean }) {
  const nextPublicDefine = Object.fromEntries(
    Object.entries(process.env)
      .filter(([key]) => key.toUpperCase().startsWith('NEXT_PUBLIC_'))
      .map(([key, value]) => [`process.env.${key}`, JSON.stringify(value)]),
  );

  return {
    '__CI__': process.env.CI === 'true' ? 'true' : 'false',
    '__DEV__': process.env.NODE_ENV !== 'production' ? 'true' : 'false',
    '__ELECTRON__': JSON.stringify(options.isElectron),
    '__MOBILE__': JSON.stringify(options.isMobile),
    ...nextPublicDefine,
    // Keep a safe fallback so generic `process.env` access won't crash in browser runtime.
    'process.env': '{}',
  };
}

export const sharedOptimizeDeps = {
  include: [
    'react',
    'react-dom',
    'react-dom/client',
    'react-router-dom',
    'antd',
    '@ant-design/icons',
    '@lobehub/ui',
    '@lobehub/ui > @emotion/react',
    'antd-style',
    'zustand',
    'zustand/middleware',
    'swr',
    'i18next',
    'react-i18next',
    'dayjs',
    'dayjs/esm/locale/en',
    'dayjs/esm/locale/zh-cn',

    'ahooks',
    'motion/react',
  ],
};
