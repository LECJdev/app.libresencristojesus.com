import { getBogotaDateString } from './attendance-date.ts';

export interface PersonaOption {
  id: string;
  nombres: string | null;
  apellidos: string | null;
}

export interface CasaPazLinkReportItem {
  id: string;
  nombre: string;
  estado: 'ACTIVO' | 'INACTIVO';
  diaRegistro: string;
  direccionCasa: string;
  redName: string | null;
  attendanceTotal: number;
  uniquePeopleReached: number;
  newPeopleTotal: number;
  sessionCount: number;
  offeringTotal: number;
  lastAttendanceDate: string | null;
}

export interface CasaPazRedReportItem {
  idRed: string | null;
  nombreRed: string | null;
  attendanceTotal: number;
  uniquePeopleReached: number;
}

export interface CasaPazDateReportItem {
  fecha: string;
  dayLabel: string;
  attendanceTotal: number;
  uniquePeopleReached: number;
  newPeopleTotal: number;
  sessionCount: number;
  offeringTotal: number;
}

export interface CasaPazEncounterCandidateItem {
  id: string;
  nombres: string | null;
  apellidos: string | null;
  documento: string | null;
  celular: string | null;
  encuentro: boolean | null;
  redName: string | null;
  attendanceCount: number;
  firstAttendanceDate: string | null;
  lastAttendanceDate: string | null;
  linksCount: number;
}

export interface CasaPazReportSummaryMetrics {
  activeLinks: number;
  totalLinks: number;
  linksWithAttendance: number;
  attendanceTotal: number;
  uniquePeopleReached: number;
  newPeopleTotal: number;
  sessionCount: number;
  offeringTotal: number;
  possibleEncounterCandidates: number;
}

export interface CasaPazScopedLinkInfo {
  id: string;
  nombre: string;
  estado: 'ACTIVO' | 'INACTIVO';
  diaRegistro: string;
  direccionCasa: string;
  redName: string | null;
}

export interface CasaPazReportResponse {
  generatedAt: string;
  scope: 'global' | 'scoped' | 'link';
  filters: {
    month: string | null;
    fecha: string | null;
    asistenciaId: string | null;
  };
  summary: CasaPazReportSummaryMetrics;
  scopedLinks: CasaPazScopedLinkInfo[];
  attendanceByLink: CasaPazLinkReportItem[];
  attendanceByRed: CasaPazRedReportItem[];
  attendanceByDate: CasaPazDateReportItem[];
  encounterCandidates: CasaPazEncounterCandidateItem[];
}

export interface CasaPazEncounterCandidatesReportResponse {
  generatedAt: string;
  filters: {
    month: string | null;
    fecha: string | null;
  };
  total: number;
  candidates: CasaPazEncounterCandidateItem[];
}

export function buildPersonaName(persona: PersonaOption | null | undefined) {
  if (!persona) return '—';
  const fullName = `${persona.nombres || ''} ${persona.apellidos || ''}`.trim();
  if (fullName) return fullName;
  return persona.id;
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDateLabel(value: string | null) {
  if (!value) return '—';

  return new Intl.DateTimeFormat('es-CO', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${value}T00:00:00.000Z`));
}

export function getCurrentMonthValue(date: Date = new Date()) {
  return getBogotaDateString(date).slice(0, 7);
}

export function getCurrentDateValue(date: Date = new Date()) {
  return getBogotaDateString(date);
}
