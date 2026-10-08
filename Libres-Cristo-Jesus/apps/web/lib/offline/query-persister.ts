import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';

/**
 * Persistencia del caché de lectura de `@tanstack/react-query` (RN-1202).
 *
 * ── Qué resuelve ──────────────────────────────────────────────────────
 * `queue-db.ts` ya cubre la ESCRITURA offline (Regla 2): las mutaciones se
 * encolan y se reenvían al reconectar. Pero una pantalla que se abre sin
 * conexión y sin caché previo en memoria no tiene nada que mostrar: React
 * Query guarda su estado solo en memoria, y esa memoria se pierde al
 * recargar o cerrar la pestaña. RN-1202 exige que las consultas ya vistas
 * sigan disponibles con conectividad limitada, así que ese caché necesita
 * sobrevivir en disco.
 *
 * ── Por qué IndexedDB nativo, sin idb/dexie ──────────────────────────
 * Misma razón que en `queue-db.ts`: `localStorage` es síncrono, tiene un
 * techo de unos 5 MB compartido con todo lo demás, y el caché serializado
 * de varias pantallas puede superarlo con facilidad. Lo que
 * `createAsyncStoragePersister` necesita es una interfaz de tres métodos
 * (`getItem`/`setItem`/`removeItem`) sobre UNA sola clave — no justifica
 * traer una librería wrapper para eso, igual que en la cola de mutaciones.
 *
 * ── Por qué una base separada de `lcj-offline` ───────────────────────
 * La cola de mutaciones y el caché de lectura tienen ciclos de vida
 * distintos: la cola se vacía operación por operación al sincronizar, el
 * caché se reemplaza entero cada vez que React Query deshidrata. Mezclarlos
 * en el mismo almacén acoplaría dos responsabilidades que no tienen nada
 * en común.
 */

const DB_NAME = 'lcj-query-cache';
const DB_VERSION = 1;
const STORE = 'cache';
/** Única clave usada: el persister de TanStack guarda el caché completo como un solo valor. */
const CACHE_KEY = 'react-query-cache';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('No se pudo abrir el caché local.'));
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
        request.onerror = () => reject(request.error ?? new Error('Error en el caché local.'));
        transaction.oncomplete = () => db.close();
      }),
  );
}

/** Adaptador de `AsyncStorage` que pide `createAsyncStoragePersister`. */
const indexedDbStorage = {
  getItem: async (key: string): Promise<string | null> => {
    const value = await tx<string | undefined>('readonly', (store) => store.get(key));
    return value ?? null;
  },
  setItem: async (key: string, value: string): Promise<void> => {
    await tx('readwrite', (store) => store.put(value, key));
  },
  removeItem: async (key: string): Promise<void> => {
    await tx('readwrite', (store) => store.delete(key));
  },
};

/** Persister listo para `PersistQueryClientProvider` (RN-1202). */
export const queryPersister = createAsyncStoragePersister({
  storage: indexedDbStorage,
  key: CACHE_KEY,
});
