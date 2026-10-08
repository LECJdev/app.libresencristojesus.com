'use client';

import { useCallback, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { SyncQueueStatus } from '@lcj/types';
import { listAll } from '@/lib/offline/queue-db';
import { pushQueue } from '@/lib/offline/sync-client';

/**
 * Estado de la sincronización y su disparo automático (RN-1203, Regla 8).
 *
 * ── Cuándo se sincroniza ─────────────────────────────────────────────
 * Al recuperar la conexión (`online`), al volver a la pestaña
 * (`visibilitychange`) y al montar. El evento `online` por sí solo no
 * alcanza: un teléfono que estuvo con la pantalla apagada puede reconectar
 * sin que la página lo escuche, y el usuario vuelve a una app que dice
 * "pendiente" con señal completa.
 *
 * ── Por qué no hay un temporizador ───────────────────────────────────
 * Un intervalo despierta la radio del teléfono cada N segundos para
 * descubrir, casi siempre, que no hay nada que hacer. Los tres eventos de
 * arriba cubren el caso real sin gastar batería.
 */

export interface SyncState {
  status: SyncQueueStatus;
  /** Operaciones aún sin confirmar. */
  pending: number;
  /** Operaciones que esperan una decisión humana (Regla 6). */
  conflicts: number;
  /** Mensajes del servidor que el usuario debe leer. */
  messages: string[];
  /** Fuerza un intento, para el botón "reintentar". */
  sync: () => Promise<void>;
}

export function useSync(): SyncState {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<SyncQueueStatus>('idle');
  const [pending, setPending] = useState(0);
  const [conflicts, setConflicts] = useState(0);
  const [messages, setMessages] = useState<string[]>([]);

  const refreshCounts = useCallback(async (): Promise<number> => {
    const all = await listAll();
    const waiting = all.filter((op) => op.needsAttention !== true);
    setPending(waiting.length);
    setConflicts(all.length - waiting.length);
    return waiting.length;
  }, []);

  const sync = useCallback(async () => {
    const waiting = await refreshCounts();
    if (waiting === 0) {
      setStatus((current) => (current === 'syncing' ? 'synced' : current));
      return;
    }

    if (!navigator.onLine) {
      setStatus('pending');
      return;
    }

    setStatus('syncing');
    try {
      const outcome = await pushQueue();
      setMessages(outcome.messages);

      const remaining = await refreshCounts();

      /*
       * Se invalida TODO tras sincronizar: las operaciones acaban de escribir
       * asistencia, personas, ofrendas y fotos en el servidor, y lo que el
       * cliente tiene en caché quedó viejo. Invalidar selectivamente exigiría
       * mapear cada tipo de operación a sus claves de consulta — una segunda
       * tabla de correspondencias que se desincronizaría del ejecutor.
       */
      await queryClient.invalidateQueries();

      setStatus(outcome.conflicted > 0 ? 'conflict' : remaining > 0 ? 'pending' : 'synced');
    } catch {
      // El detalle ya quedó en la cola; acá solo importa el estado visible.
      setStatus('error');
    }
  }, [queryClient, refreshCounts]);

  useEffect(() => {
    void sync();

    const onOnline = () => void sync();
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void sync();
      }
    };
    const onOffline = () => {
      setStatus((current) => (current === 'synced' ? 'idle' : current));
    };

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [sync]);

  return { status, pending, conflicts, messages, sync };
}
