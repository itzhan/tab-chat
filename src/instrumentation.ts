export async function register() {
  // In local development, write debug logs to logs/server.log
  if (process.env.NODE_ENV !== 'production' && process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./libs/debug-file-logger');
  }

  // Outbound fetch tuning. Two cases handled here:
  //
  //  1) When HTTP(S)_PROXY env is set (Clash etc.), route fetch through the
  //     proxy. Node's built-in fetch ignores env proxies by default.
  //  2) Otherwise install a keep-alive Agent with a generous per-origin
  //     connection pool. Default undici Agent has connections=null (unbounded
  //     per-origin) but Node's HTTP client tends to recycle aggressively;
  //     setting a long keepAliveTimeout + explicit pool size makes upstream
  //     calls (OpenAI / sub2api / S3 loopback / etc.) reuse TCP+TLS instead
  //     of paying ~50-500ms handshake every call. Big multiplier for image
  //     generation since each request talks to multiple upstreams.
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      const { Agent, EnvHttpProxyAgent, setGlobalDispatcher } = await import('undici');
      const httpProxy =
        process.env.HTTPS_PROXY ||
        process.env.HTTP_PROXY ||
        process.env.https_proxy ||
        process.env.http_proxy;

      if (httpProxy) {
        setGlobalDispatcher(new EnvHttpProxyAgent());
        console.info('[instrumentation] global HTTP proxy enabled via env:', httpProxy);
      } else {
        setGlobalDispatcher(
          new Agent({
            connect: { timeout: 30_000 },
            connections: 100, // max concurrent sockets per origin
            keepAliveMaxTimeout: 60_000,
            keepAliveTimeout: 30_000,
            pipelining: 1,
          }),
        );
        console.info(
          '[instrumentation] global undici Agent: keep-alive=30s, connections=100/origin',
        );
      }
    } catch (err) {
      console.error('[instrumentation] Failed to set global HTTP dispatcher:', err);
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
