import type { AuditableRecord, RecordStatus } from './organization';

/**
 * Wire shapes of the Escuela Kids module (Fase 11), shared by `apps/api` and
 * `apps/web`. Mirrors of the Nest DTOs in `apps/api/src/modules/kids-schools`,
 * `kids-children` and `kids-attendance` — same convention as `organization.ts`.
 */

export type KidsAssignmentRole = 'LEADER' | 'ASSISTANT';

export type KidsConsentStatus = 'PENDING_AUTHORIZATION' | 'ACTIVE' | 'INACTIVE';

/** `KidsSchool` — una sede de Escuela Kids. */
export interface KidsSchool extends AuditableRecord {
  id: string;
  name: string;
  status: RecordStatus;
}

export interface CreateKidsSchoolInput {
  name: string;
}

export interface UpdateKidsSchoolInput {
  name?: string;
  version: number;
}

/** `KidsUserAssignment` — líder/auxiliar activo o histórico de una sede. */
export interface KidsAssignment {
  id: string;
  kidsSchoolId: string;
  leadershipUnitId: string;
  role: KidsAssignmentRole;
  canCreateChild: boolean;
  startDate: string;
  /** Null mientras la asignación está activa. */
  endDate: string | null;
  reason: string | null;
  createdBy: string | null;
  createdAt: string;
}

export interface CreateKidsAssignmentInput {
  leadershipUnitId: string;
  role: KidsAssignmentRole;
  reason?: string;
}

/** `KidsChild` — roster row (sin acudientes ni autorización). */
export interface KidsChild extends AuditableRecord {
  id: string;
  kidsSchoolId: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  /** Calculada por el backend en cada respuesta — nunca se envía en un input. */
  age: number;
  photo: string | null;
  notes: string | null;
  status: RecordStatus;
}

export interface KidsGuardian {
  id: string;
  firstName: string;
  lastName: string;
  relationship: string;
  phone: string;
  altPhone: string | null;
  email: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
}

/** El vínculo niño↔acudiente + los datos del acudiente. */
export interface KidsChildGuardian {
  id: string;
  kidsChildId: string;
  isPrimary: boolean;
  guardian: KidsGuardian;
}

export interface KidsConsent {
  id: string;
  kidsChildId: string;
  status: KidsConsentStatus;
  documentPath: string | null;
  signedAt: string | null;
  uploadedAt: string | null;
  uploadedBy: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
}

/** `GET /kids/children/:id` — perfil completo, autorización siempre presente. */
export interface KidsChildDetail extends KidsChild {
  guardians: KidsChildGuardian[];
  consent: KidsConsent;
}

export interface CreateKidsChildInput {
  firstName: string;
  lastName: string;
  /** Fecha ISO (YYYY-MM-DD). */
  birthDate: string;
  photo?: string;
  notes?: string;
}

export interface UpdateKidsChildInput {
  firstName?: string;
  lastName?: string;
  birthDate?: string;
  photo?: string | null;
  notes?: string | null;
  version: number;
}

/**
 * `POST /kids/children/:id/guardians` — dos modos según `guardianId`:
 * presente vincula uno existente (hermanos), ausente crea uno nuevo con
 * `firstName`/`lastName`/`relationship`/`phone` obligatorios.
 */
export interface CreateKidsGuardianInput {
  guardianId?: string;
  firstName?: string;
  lastName?: string;
  relationship?: string;
  phone?: string;
  altPhone?: string;
  email?: string;
  isPrimary?: boolean;
}

export interface UpdateKidsGuardianInput {
  firstName?: string;
  lastName?: string;
  relationship?: string;
  phone?: string;
  altPhone?: string | null;
  email?: string | null;
  version: number;
}

/**
 * `PATCH /kids/children/:id/consent`. `documentPath` presente siempre
 * transiciona a `ACTIVE`; sin él, `status` permite una transición manual
 * (ej. `INACTIVE` para revocar) sin tocar el documento ya cargado.
 */
export interface UpdateKidsConsentInput {
  documentPath?: string;
  /** Fecha ISO (YYYY-MM-DD) en que el documento físico fue firmado. */
  signedAt?: string;
  status?: KidsConsentStatus;
}

/** Una fila del checklist de asistencia de una reunión de Escuela Kids. */
export interface KidsChecklistRow {
  childId: string;
  firstName: string;
  lastName: string;
  photo: string | null;
  present: boolean;
}

/** La lista de asistencia completa de una reunión semanal de Escuela Kids. */
export interface KidsChecklist {
  meetingId: string;
  kidsSchoolId: string;
  meetingDate: string;
  /** Año ISO — no el año calendario. */
  isoYear: number;
  isoWeek: number;
  rows: KidsChecklistRow[];
  presentCount: number;
}

/** Un punto del sparkline de asistencia — una reunión semanal pasada. */
export interface KidsAttendanceTrendPoint {
  isoYear: number;
  isoWeek: number;
  /** Etiqueta corta, p. ej. "Sem 34". */
  label: string;
  attendancePercent: number;
}

/** `GET /kids/schools/:schoolId/metrics` — indicadores del dashboard de una sede. */
export interface KidsSchoolMetrics {
  kidsSchoolId: string;
  totalChildren: number;
  present: number;
  absent: number;
  averageAttendance: number;
  pendingConsents: number;
  newChildren: number;
  inactiveChildren: number;
  attendanceTrend: KidsAttendanceTrendPoint[];
}
