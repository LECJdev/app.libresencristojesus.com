/**
 * Contrato de sincronización offline (Fase 10, RN-1202/RN-1203).
 *
 * Vive en el paquete compartido porque cliente y servidor tienen que estar
 * de acuerdo en la FORMA EXACTA de cada operación. El dispositivo la crea sin
 * conexión, posiblemente días antes de que el servidor la vea; si las dos
 * mitades derivan, el síntoma aparece recién al sincronizar — cuando el
 * usuario ya trabajó y ya no puede rehacerlo.
 */

/** Las operaciones que un Líder puede realizar sin conexión (Regla 1). */
export type SyncOperationType =
  /** Marcar o desmarcar la asistencia de una persona. */
  | 'ATTENDANCE_MARK'
  /** Marcar o desmarcar a toda la lista de una vez. */
  | 'ATTENDANCE_MARK_ALL'
  /** Registrar una persona nueva, típicamente en plena reunión. */
  | 'PERSON_CREATE'
  /** Tema, predicador y observaciones de la reunión. */
  | 'MEETING_REPORT'
  /** Registrar o corregir la ofrenda. */
  | 'OFFERING_UPSERT'
  /** Adjuntar una fotografía ya subida. */
  | 'MEETING_PHOTO_ADD';

/**
 * Una operación encolada.
 *
 * `operationId` LO GENERA EL DISPOSITIVO. Es la clave de idempotencia
 * (Regla 5): reenviar la cola tras perder la respuesta manda los mismos
 * identificadores, y el servidor reconoce lo ya aplicado en vez de
 * duplicarlo. Un id del servidor no serviría — cada reintento pediría uno
 * nuevo.
 */
export interface SyncOperationInput {
  /** UUID v4 generado por el cliente. */
  operationId: string;
  /** La reunión afectada. Ausente en operaciones que no cuelgan de una. */
  meetingId?: string;
  /** Identificador estable del dispositivo, para trazabilidad (Regla 7). */
  deviceId: string;
  /**
   * CUÁNDO SE HIZO DE VERDAD, en ISO-8601.
   *
   * Contra esta fecha se evalúa el bloqueo semanal (Regla 3), NUNCA contra
   * la fecha de llegada. Un líder que tomó asistencia el domingo a las 20:00
   * sin señal y sincroniza el lunes a las 09:00 debe ser aceptado: la
   * operación fue creada antes del cierre.
   */
  createdOfflineAt: string;
  operationType: SyncOperationType;
  /** Cuerpo específico del tipo de operación. */
  payload: Record<string, unknown>;
}

export type SyncOperationStatus =
  /** Aplicada al dominio. */
  | 'APPLIED'
  /** Ya estaba aplicada; se reconoce sin volver a ejecutarla (Regla 5). */
  | 'DUPLICATE'
  /** La regla de negocio la rechazó. No se reintenta (Regla 4). */
  | 'REJECTED'
  /** Choca con un dato existente y requiere resolución manual (Regla 6). */
  | 'CONFLICT';

/** Resultado de una operación dentro del lote. */
export interface SyncOperationResult {
  operationId: string;
  status: SyncOperationStatus;
  /**
   * Explicación en español, mostrable tal cual. En un rechazo es lo único
   * que le dice al líder qué pasó con el trabajo que ya había hecho.
   */
  message: string;
}

export interface SyncBatchInput {
  operations: SyncOperationInput[];
}

export interface SyncBatchResult {
  results: SyncOperationResult[];
  applied: number;
  duplicated: number;
  rejected: number;
  conflicted: number;
}

/**
 * Estado de la cola local, para el indicador visual (Regla 8).
 *
 * `error` es distinto de `conflict` a propósito: un error se reintenta solo
 * cuando vuelva la conexión, un conflicto necesita que una persona decida.
 */
export type SyncQueueStatus = 'idle' | 'pending' | 'syncing' | 'synced' | 'error' | 'conflict';
