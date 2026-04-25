import type { Plugin } from 'vite';

/**
 * Dev-mode shim that mirrors what the Next.js SSR route
 * (`src/app/spa/[variants]/[[...path]]/route.ts`) does in production: pre-fetch
 * the global server config and inject it into `index.html` as
 * `window.__SERVER_CONFIG__` so the SPA can hydrate synchronously.
 *
 * Why this exists: in dev the SPA is served by Vite directly at
 * `localhost:9876`, which leaves the placeholder `__SERVER_CONFIG__ =
 * undefined` untouched. The client then falls back to the
 * `/trpc/lambda/config.getGlobalConfig` round-trip on every page load, which
 * walks the full provider config (15MB model-bank dynamic import) and feels
 * like a 20s cold start every time the dev session starts. By doing the
 * pre-fetch here once per dev server lifetime, every page load skips that call.
 *
 * This is a no-op in build mode; production already has the Next.js SSR route
 * doing the same injection.
 */
export function viteDevInjectServerConfig(): Plugin {
  let cached: string | undefined;
  let backendPort: string | number;

  const fetchSpaConfig = async (): Promise<string | undefined> => {
    const trpcInput = encodeURIComponent(
      JSON.stringify({ json: null, meta: { values: ['undefined'], v: 1 } }),
    );
    const url = `http://localhost:${backendPort}/trpc/lambda/config.getGlobalConfig?input=${trpcInput}`;
    try {
      // The Next.js dev server may take a while to boot the first time; give
      // it a generous deadline rather than racing it.
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60_000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) return undefined;
      const body = await res.json();
      const trpcData = body?.result?.data?.json;
      if (!trpcData) return undefined;

      const spaConfig = {
        analyticsConfig: {},
        clientEnv: {},
        config: trpcData.serverConfig,
        featureFlags: trpcData.serverFeatureFlags,
        isMobile: false,
      };

      // Same escape rules as `serializeForHtml` so the value is safe inside a
      // `<script>` tag.
      return JSON.stringify(spaConfig)
        .replaceAll('<', '\\u003c')
        .replaceAll('>', '\\u003e')
        .replaceAll('&', '\\u0026')
        .replaceAll("'", '\\u0027');
    } catch {
      return undefined;
    }
  };

  return {
    name: 'lobe-dev-inject-server-config',
    apply: 'serve',
    configResolved() {
      backendPort = process.env.PORT || 3010;
    },
    async transformIndexHtml(html) {
      if (!cached) {
        cached = await fetchSpaConfig();
      }
      if (!cached) return html;
      return html.replace(
        /window\.__SERVER_CONFIG__\s*=\s*undefined;\s*\/\*\s*SERVER_CONFIG\s*\*\//,
        `window.__SERVER_CONFIG__ = ${cached};`,
      );
    },
  };
}
