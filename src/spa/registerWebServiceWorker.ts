const registerWebServiceWorker = () => {
  if (import.meta.env.DEV || !('serviceWorker' in navigator)) return;

  const register = () => {
    const base = import.meta.env.BASE_URL || '/';
    const swUrl = `${base.endsWith('/') ? base : `${base}/`}sw.js`;

    navigator.serviceWorker.register(swUrl).catch((error) => {
      console.error('[SW] registration failed:', error);
    });
  };

  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(register, { timeout: 3000 });
    return;
  }

  globalThis.setTimeout(register, 1500);
};

export default registerWebServiceWorker;
