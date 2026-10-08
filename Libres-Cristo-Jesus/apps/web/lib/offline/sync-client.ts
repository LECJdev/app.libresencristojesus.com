import type { SyncBatchResult } from '@lcj/types';
import { apiFetch } from '@/lib/http-client';
import { listPending, markNeedsAttention, recordAttempt, remove } from './queue-db';

/**
 * Envía la cola local al servidor (RN-1203).
 *
 * ── Qué sale de la cola y qué se queda ───────────────────────────────
 * `APPLIED` y `DUPLICATE` salen: el servidor confirmó que el dato está.
 * `REJECTED` también sale, y esto es lo importante — un rechazo es
 * DEFINITIVO. La semana ya cerrada no se va a reabrir sola, así que
 * reintentar daría el mismo rechazo para siempre y dejaría atrapada detrás
 * al resto de la cola. Sale, pero el mensaje se muestra: el líder tiene
 * derecho a saber qué pasó con el trabajo que hizo.
 * `CONFLICT` se queda, marcada, esperando que una persona decida (Regla 6).
 *
 * ── Todo o nada, no ──────────────────────────────────────────────────
 * El lote se procesa completo y cada operación reporta lo suyo. Abortar
 * ante el primer problema haría que una sola operación mala bloqueara
 * indefinidamente todo lo bueno que quedó detrás.
 */

const MAX_BATCH = 200;

export interface SyncOutcome {
  sent: number;
  applied: number;
  rejected: number;
  conflicted: number;
  /** Mensajes que el usuario debe ver: rechazos y conflictos. */
  messages: string[];
}

/** `true` cuando quedan operaciones sin enviar. */
export async function hasPendingOperations(): Promise<boolean> {
  return (await listPending()).length > 0;
}

/**
 * Empuja lo pendiente. Es seguro llamarla de más: si no hay nada que enviar
 * no hace ninguna petición, y el servidor es idempotente por `operationId`.
 */
export async function pushQueue(): Promise<SyncOutcome> {
  const pending = await listPending();

  if (pending.length === 0) {
    return { sent: 0, applied: 0, rejected: 0, conflicted: 0, messages: [] };
  }

  // Ya vienen ordenadas por `createdOfflineAt`; el corte respeta ese orden
  // para que el servidor nunca vea una operación posterior antes que la
  // anterior.
  const batch = pending.slice(0, MAX_BATCH);

  let result: SyncBatchResult;
  try {
    result = await apiFetch<SyncBatchResult>('/sync/operations', {
      method: 'POST',
      body: {
        operations: batch.map(({ attempts: _a, lastMessage: _m, needsAttention: _n, ...op }) => op),
      },
    });
  } catch (error) {
    // Fallo de RED, no del servidor: nada sale de la cola. Se registra el
    // intento para poder mostrar "error de sincronización" y se reintenta
    // cuando vuelva la conexión.
    const message = error instanceof Error ? error.message : 'Sin conexión con el servidor.';
    await Promise.all(batch.map((operation) => recordAttempt(operation.operationId, message)));
    throw error;
  }

  const messages: string[] = [];

  for (const item of result.results) {
    if (item.status === 'CONFLICT') {
      await markNeedsAttention(item.operationId, item.message);
      messages.push(item.message);
      continue;
    }

    if (item.status === 'REJECTED') {
      messages.push(item.message);
    }

    await remove(item.operationId);
  }

  return {
    sent: batch.length,
    applied: result.applied + result.duplicated,
    rejected: result.rejected,
    conflicted: result.conflicted,
    messages,
  };
}
