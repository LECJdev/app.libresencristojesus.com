export interface DominicalReportLink {
  id: string;
  nombre: string;
  estado: 'ACTIVO' | 'INACTIVO';
  diaRegistro: string;
  sede: {
    id: string;
    nombre: string | null;
  } | null;
}

export interface DominicalReportDate {
  fecha: string;
  totalAsistentes: number;
  totalNuevos: number;
}

export interface DominicalReportRed {
  idRed: string | null;
  nombreRed: string | null;
  totalAsistentes: number;
}

export interface DominicalReportPerson {
  id: string;
  nombres: string | null;
  apellidos: string | null;
  attendanceByDate: Record<string, boolean>;
}

export interface DominicalReportResponse {
  generatedAt: string;
  asistencia: DominicalReportLink;
  filters: {
    monthFrom: string | null;
    monthTo: string | null;
  };
  attendanceByDate: DominicalReportDate[];
  attendanceByRed: DominicalReportRed[];
  people: DominicalReportPerson[];
}

export interface DominicalPersonDetailResponse {
  persona: {
    id: string;
    nombres: string | null;
    apellidos: string | null;
    edad: number | null;
    celular: string | null;
    tipoDocumento: string | null;
    documento: string | null;
    genero: string | null;
    direccion: string | null;
    correo: string | null;
    encuentro: boolean | null;
    rol: string;
    roles: string[];
    barrio: string | null;
    departamento: string | null;
    ciudad: string | null;
    fechaNacimiento: string | null;
    idRed: string | null;
    red: {
      id: string;
      nombre: string | null;
      detalles: string | null;
      idSede: string | null;
      sede: {
        id: string;
        nombre: string | null;
        direccion: string | null;
      } | null;
    } | null;
    invitadoPor: {
      id: string;
      nombres: string | null;
      apellidos: string | null;
    } | null;
    fechaCreacion: string | null;
    fechaModificacion: string | null;
  };
  casaDePaz: {
    legacy: Array<{
      id: string;
      direccion: string | null;
      detalle: string | null;
      activa: boolean | null;
      diaDePredica: string | null;
      idDistrito: string | null;
    }>;
    qr: Array<{
      id: string;
      nombre: string;
      estado: string;
      diaRegistro: string;
      direccionCasa: string;
      red: { id: string; nombre: string | null } | null;
      roles: string[];
    }>;
  };
}

export interface DominicalMatrixRow {
  rowNumber: number;
  person: DominicalReportPerson;
  attendance: boolean[];
}

export interface DominicalRedSegment {
  key: string;
  label: string;
  value: number;
  percentage: number;
  color: string;
}

const DONUT_COLORS = [
  '#0f172a',
  '#2563eb',
  '#0f766e',
  '#d97706',
  '#7c3aed',
  '#be123c',
  '#64748b',
];

export function getDominicalReportDates(report: DominicalReportResponse): string[] {
  return report.attendanceByDate
    .map((item) => item.fecha)
    .sort((left, right) => left.localeCompare(right));
}

export function buildDominicalMatrixRows(
  report: DominicalReportResponse,
): DominicalMatrixRow[] {
  const dates = getDominicalReportDates(report);

  return report.people.map((person, index) => ({
    rowNumber: index + 1,
    person,
    attendance: dates.map((date) => person.attendanceByDate[date] === true),
  }));
}

export function buildDominicalRedSegments(
  report: DominicalReportResponse,
): DominicalRedSegment[] {
  const total = report.attendanceByRed.reduce(
    (sum, item) => sum + item.totalAsistentes,
    0,
  );

  return report.attendanceByRed.map((item, index) => ({
    key: item.idRed ?? 'unassigned',
    label: item.nombreRed?.trim() || 'Sin Red asignada',
    value: item.totalAsistentes,
    percentage: total > 0 ? (item.totalAsistentes / total) * 100 : 0,
    color: DONUT_COLORS[index % DONUT_COLORS.length],
  }));
}

export function buildDominicalDonutGradient(
  segments: DominicalRedSegment[],
): string {
  if (segments.length === 0) {
    return 'conic-gradient(#e2e8f0 0 100%)';
  }

  let offset = 0;
  const stops = segments.map((segment) => {
    const start = offset;
    offset += segment.percentage;
    return `${segment.color} ${start}% ${offset}%`;
  });

  return `conic-gradient(${stops.join(', ')})`;
}

export function formatDominicalDateLabel(fecha: string): string {
  return new Intl.DateTimeFormat('es-CO', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  })
    .format(new Date(`${fecha}T00:00:00.000Z`))
    .replace('.', '');
}

export function getDominicalMonthRange(dates: string[]): {
  monthFrom: string;
  monthTo: string;
} | null {
  const sortedDates = [...dates].sort((left, right) => left.localeCompare(right));

  if (sortedDates.length === 0) {
    return null;
  }

  return {
    monthFrom: sortedDates[0].slice(0, 7),
    monthTo: sortedDates[sortedDates.length - 1].slice(0, 7),
  };
}

export function getDominicalPersonName(person: DominicalReportPerson): string {
  return `${person.nombres ?? ''} ${person.apellidos ?? ''}`.trim() || person.id;
}
