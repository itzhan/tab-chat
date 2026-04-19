export async function register() {
  // In local development, write debug logs to logs/server.log
  if (process.env.NODE_ENV !== 'production' && process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./libs/debug-file-logger');
  }

  // Route outbound fetch through HTTP(S)_PROXY env vars (e.g. Clash on 7897).
  // Node's built-in fetch() ignores env proxies by default, so we wire it up
  // here. Requests to NO_PROXY hosts (localhost/Vite) bypass automatically.
  if (
    process.env.NEXT_RUNTIME === 'nodejs' &&
    (process.env.HTTPS_PROXY ||
      process.env.HTTP_PROXY ||
      process.env.https_proxy ||
      process.env.http_proxy)
  ) {
    try {
      const { EnvHttpProxyAgent, setGlobalDispatcher } = await import('undici');
      setGlobalDispatcher(new EnvHttpProxyAgent());

      console.info(
        '[instrumentation] global HTTP proxy enabled via env:',
        process.env.HTTPS_PROXY ||
          process.env.HTTP_PROXY ||
          process.env.https_proxy ||
          process.env.http_proxy,
      );
    } catch (err) {
      console.error('[instrumentation] Failed to set global HTTP proxy dispatcher:', err);
    }
  }

  // Auto-start GatewayManager on server start for non-Vercel environments (Docker, local).
  // Persistent bots need reconnection after restart.
  // On Vercel, the cron job at /api/agent/gateway handles this reliably instead.
  // In local dev, opt-in via ENABLE_BOT_IN_DEV to avoid clobbering a shared bot binding.
  const isDev = process.env.NODE_ENV !== 'production';
  if (
    process.env.NEXT_RUNTIME === 'nodejs' &&
    process.env.DATABASE_URL &&
    !process.env.VERCEL_ENV &&
    (!isDev || process.env.ENABLE_BOT_IN_DEV === '1')
  ) {
    const { GatewayService } = await import('./server/services/gateway');
    const service = new GatewayService();
    service.ensureRunning().catch((err) => {
      console.error('[Instrumentation] Failed to auto-start GatewayManager:', err);
    });
  }

  if (process.env.NODE_ENV !== 'production' && !process.env.ENABLE_TELEMETRY_IN_DEV) {
    return;
  }

  const shouldEnable = process.env.ENABLE_TELEMETRY && process.env.NEXT_RUNTIME === 'nodejs';
  if (!shouldEnable) {
    return;
  }

  await import('./instrumentation.node');
}
