import type { SyncOperationType } from '@lcj/types';
import { ApiError } from '@/lib/http-client';
import { buildOperation, enqueue } from './queue-db';

/**
 * Convierte cualquier escritura en una escritura que sobrevive a la falta de
 * conexión (Regla 1: "el usuario nunca deberá perder información por
 * ausencia de Internet").
 *
 * ── Se intenta la red PRIMERO, siempre ───────────────────────────────
 * Con conexión, la operación va directo y el usuario ve el resultado real
 * del servidor — incluidos los rechazos, en el momento en que puede
 * corregirlos. Escribir siempre en la cola y sincronizar después habría sido
 * más simple de programar y peor de usar: convertiría toda la aplicación en
 * asíncrona para resolver un problema que la mayoría del tiempo no existe.
 *
 * ── Qué cuenta como "sin conexión" ───────────────────────────────────
 * SOLO un fallo de transporte. Un 400, un 403 o un 409 son respuestas del
 * servidor: significan que la operación está mal, y encolarla la reintentaría
 * eternamente contra el mismo rechazo. `ApiError` lleva `status`, así que la
 * distinción es explícita y no una heurística sobre el texto del error.
 *
 * Un `status` de 0 sí se encola: es lo que produce `fetch` cuando no hubo
 * respuesta alguna.
 */
function isTransportFailure(error: unknown): boolean {
  if (error instanceof ApiError) {
    // Sin respuesta del servidor. Todo código HTTP real es una decisión suya.
    return error.status === 0;
  }
  // `TypeError: Failed to fetch` — el navegador ni siquiera pudo salir.
  return error instanceof TypeError;
}

export class QueuedOfflineError extends Error {
  constructor(readonly operationId: string) {
    super(
      'Sin conexión. El cambio quedó guardado en este dispositivo y se enviará automáticamente cuando vuelva la señal.',
    );
    this.name = 'QueuedOfflineError';
  }
}

/**
 * Ejecuta `run`; si falla por transporte, encola la operación equivalente.
 *
 * Lanza `QueuedOfflineError` en vez de resolver con un valor falso. La
 * alternativa —devolver una respuesta inventada— haría que la pantalla
 * mostrara datos que el servidor nunca confirmó, que es exactamente la
 * confusión que el indicador de sincronización existe para evitar. Quien
 * llama decide cómo reflejarlo; el estado de la cola lo cuenta aparte.
 */
export async function withOfflineFallback<T>(
  run: () => Promise<T>,
  operation: {
    type: SyncOperationType;
    payload: Record<string, unknown>;
    meetingId?: string;
  },
): Promise<T> {
  // Atajo honesto: si el navegador ya sabe que no hay red, no se gasta un
  // intento que va a fallar. `navigator.onLine` miente en el sentido
  // optimista (dice `true` en una red sin salida), nunca en el pesimista.
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    const queued = buildOperation(operation.type, operation.payload, operation.meetingId);
    await enqueue(queued);
    throw new QueuedOfflineError(queued.operationId);
  }

  try {
    return await run();
  } catch (error) {
    if (!isTransportFailure(error)) {
      throw error;
    }

    const queued = buildOperation(operation.type, operation.payload, operation.meetingId);
    await enqueue(queued);
    throw new QueuedOfflineError(queued.operationId);
  }
}
