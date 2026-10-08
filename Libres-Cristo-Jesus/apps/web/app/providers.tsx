'use client';

import { useState, type ReactNode } from 'react';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { ToastProvider } from '@lcj/ui';
import { useSessionBootstrap } from '@/hooks/use-session-bootstrap';
import { queryPersister } from '@/lib/offline/query-persister';

/**
 * App-wide client providers. `QueryClient` is created inside `useState`
 * (not at module scope) so each request/session gets its own instance —
 * the standard Next.js App Router pattern, since a module-scope client
 * would otherwise be shared across unrelated SSR requests.
 *
 * El caché se persiste en IndexedDB (RN-1202) para que las pantallas ya
 * vistas abran con datos aunque no haya conexión. Solo se persisten
 * queries en estado `success`: una query en error o en curso no es un dato
 * confiable para reponer offline.
 *
 * `ToastProvider` envuelve toda la app (no solo la vitrina del design
 * system): es el único canal para avisos como "se guardó sin conexión"
 * (doc18 §19, "un solo sistema"), así que cualquier pantalla debe poder
 * llamar a `useToast()`.
 */
export function Providers({ children }: { children: ReactNode }): ReactNode {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          mutations: {
            // Descubierto con el e2e de escritura offline (Fase 10): el
            // `networkMode` por defecto ('online') hace que React Query
            // deje una mutación "paused" apenas `navigator.onLine` es
            // `false`, sin llegar a invocar `mutationFn` — y es justo
            // `mutationFn` (vía `withOfflineFallback`) quien detecta la
            // falta de red y encola la operación en IndexedDB (Regla 1).
            // Con el modo por defecto, esa cola propia nunca se activa: la
            // mutación queda pausada para siempre, no hay error que
            // capturar ni aviso que mostrar. `'always'` deja que la app
            // maneje offline con su propia lógica, no con la de la
            // librería.
            networkMode: 'always',
          },
        },
      }),
  );

  useSessionBootstrap();

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: queryPersister,
        maxAge: 1000 * 60 * 60 * 24, // 24h
        dehydrateOptions: {
          shouldDehydrateQuery: (query) => query.state.status === 'success',
        },
      }}
    >
      <ToastProvider>{children}</ToastProvider>
    </PersistQueryClientProvider>
  );
}
