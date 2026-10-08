import type { SyncOperationInput, SyncOperationType } from '@lcj/types';

/**
 * La cola local de operaciones offline (Regla 2).
 *
 * ── Por qué IndexedDB y no localStorage ──────────────────────────────
 * `localStorage` es SÍNCRONO y bloquea el hilo principal, tiene un techo de
 * unos 5 MB compartidos con todo lo demás, y guarda solo texto. Un líder que
 * pasó una reunión entera sin señal puede tener decenas de operaciones y
 * varias rutas de fotografía; y sobre todo, `localStorage` se llena en
 * silencio: al superar la cuota lanza, y el manejador típico se traga el
 * error y pierde el dato. Perder trabajo es exactamente lo que la Regla 1
 * prohíbe.
 *
 * IndexedDB es asíncrona, tiene cuota real y guarda objetos.
 *
 * ── Sin dependencias ─────────────────────────────────────────────────
 * La API cruda de IndexedDB es incómoda, pero lo que necesitamos son cuatro
 * operaciones sobre un único almacén. Traer una librería para eso agregaría
 * peso a una aplicación que además debe funcionar en conexiones malas.
 */

const DB_NAME = 'lcj-offline';
const DB_VERSION = 1;
const STORE = 'operations';

/** Una operación encolada, con lo que el cliente necesita para gestionarla. */
export interface QueuedOperation extends SyncOperationInput {
  /**
   * Intentos de envío fallidos por red. NO cuenta los rechazos del
   * servidor: esos son definitivos y sacan la operación de la cola.
   */
  attempts: number;
  /** Mensaje del servidor cuando quedó en conflicto o fue rechazada. */
  lastMessage?: string;
  /** `true` cuando el servidor la marcó CONFLICT y espera decisión humana. */
  needsAttention?: boolean;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'operationId' });
        // Se lee siempre en orden cronológico real (Regla 2), así que el
        // índice existe desde la primera versión.
        store.createIndex('createdOfflineAt', 'createdOfflineAt');
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('No se pudo abrir la base local.'));
  });
}

function tx<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(STORE, mode);
        const request = run(transaction.objectStore(STORE));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error('Error en la base local.'));
        transaction.oncomplete = () => db.close();
      }),
  );
}

/** Añade una operación a la cola. */
export async function enqueue(operation: SyncOperationInput): Promise<void> {
  const queued: QueuedOperation = { ...operation, attempts: 0 };
  await tx('readwrite', (store) => store.put(queued));
}

/**
 * Todas las operaciones pendientes, EN ORDEN CRONOLÓGICO (Regla 2).
 *
 * El orden lo decide `createdOfflineAt`, no el de inserción: dos pestañas o
 * un reintento pueden escribir fuera de secuencia, y el servidor necesita el
 * orden en que el líder realmente hizo las cosas.
 */
export async function listPending(): Promise<QueuedOperation[]> {
  const all = await tx<QueuedOperation[]>('readonly', (store) =>
    store.index('createdOfflineAt').getAll(),
  );
  // Las que esperan decisión humana no se reenvían solas: volverían a chocar.
  return all.filter((operation) => operation.needsAttention !== true);
}

/** Todo lo que hay en la cola, incluidas las que esperan resolución manual. */
export function listAll(): Promise<QueuedOperation[]> {
  return tx<QueuedOperation[]>('readonly', (store) => store.index('createdOfflineAt').getAll());
}

/** Saca una operación de la cola — se aplicó, o fue rechazada en firme. */
export async function remove(operationId: string): Promise<void> {
  await tx('readwrite', (store) => store.delete(operationId));
}

/** Marca una operación como pendiente de decisión humana (Regla 6). */
export async function markNeedsAttention(operationId: string, message: string): Promise<void> {
  const existing = await tx<QueuedOperation | undefined>('readonly', (store) =>
    store.get(operationId),
  );
  if (!existing) {
    return;
  }
  await tx('readwrite', (store) =>
    store.put({ ...existing, needsAttention: true, lastMessage: message }),
  );
}

/** Registra un intento fallido por red, para poder mostrar el estado. */
export async function recordAttempt(operationId: string, message: string): Promise<void> {
  const existing = await tx<QueuedOperation | undefined>('readonly', (store) =>
    store.get(operationId),
  );
  if (!existing) {
    return;
  }
  await tx('readwrite', (store) =>
    store.put({ ...existing, attempts: existing.attempts + 1, lastMessage: message }),
  );
}

/**
 * Identificador estable de este dispositivo (Regla 2 y Regla 7).
 *
 * Vive en `localStorage` a propósito y no en la cola: debe sobrevivir a que
 * la cola se vacíe, y es un único valor corto. Dos teléfonos de la misma
 * pareja de líderes comparten `userId`; sin esto no hay forma de reconstruir
 * cuál de los dos originó un conflicto.
 */
export function getDeviceId(): string {
  const KEY = 'lcj-device-id';
  const existing = localStorage.getItem(KEY);
  if (existing) {
    return existing;
  }
  const generated = crypto.randomUUID();
  localStorage.setItem(KEY, generated);
  return generated;
}

/** Construye una operación lista para encolar. */
export function buildOperation(
  operationType: SyncOperationType,
  payload: Record<string, unknown>,
  meetingId?: string,
): SyncOperationInput {
  return {
    operationId: crypto.randomUUID(),
    meetingId,
    deviceId: getDeviceId(),
    // El instante REAL en que el usuario actuó. Es el dato del que depende
    // toda la Regla 3, así que se toma acá y nunca se recalcula después.
    createdOfflineAt: new Date().toISOString(),
    operationType,
    payload,
  };
}
