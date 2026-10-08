'use client';

import { useEffect } from 'react';

/**
 * Registers `public/sw.js` (doc13 Épica 9: "Instalación", "Actualizaciones").
 *
 * Renders nothing — it exists purely for the side effect, kept in a component
 * so it runs inside React's lifecycle instead of at module scope, where it
 * would also execute during SSR.
 *
 * Disabled outside production on purpose: the worker's cache-first rule for
 * `/_next/static` would serve stale chunks against the dev server's HMR, and
 * the resulting "my change didn't apply" is a genuinely miserable bug to
 * chase.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) {
      return;
    }

    function register(): void {
      void navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
        // Registration failing (unsupported browser, insecure origin, user
        // settings) degrades the app to a plain website — which is a fully
        // working app. Nothing here is worth interrupting the user for.
      });
    }

    // Waiting for `load` keeps the worker's install off the critical path of
    // the first render, where it would compete for bandwidth with the page.
    if (document.readyState === 'complete') {
      register();
      return;
    }

    window.addEventListener('load', register, { once: true });
    return () => {
      window.removeEventListener('load', register);
    };
  }, []);

  return null;
}
