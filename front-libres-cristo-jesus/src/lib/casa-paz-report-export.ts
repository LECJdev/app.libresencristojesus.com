import * as XLSX from 'xlsx';
import type { CasaPazReportResponse } from './casa-paz-reports';

export interface CasaPazReportExportRed {
  id: string;
  nombre: string | null;
}

export interface CasaPazReportExportPerson {
  id: string;
  nombres: string | null;
  apellidos: string | null;
  tipoDocumento: string | null;
  documento: string | null;
  celular: string | null;
  edad: number | null;
  genero: string | null;
  direccion: string | null;
  correo: string | null;
  barrio: string | null;
  departamento: string | null;
  ciudad: string | null;
  fechaNacimiento: string | null;
  encuentro: boolean | null;
  red: CasaPazReportExportRed | null;
}

export interface CasaPazReportExportRow {
  idRegistro: string;
  fechaRegistro: string;
  esNuevo: boolean;
  asistencia: {
    id: string;
    nombre: string;
    estado: 'ACTIVO' | 'INACTIVO';
    diaRegistro: string;
    direccionCasa: string;
    red: CasaPazReportExportRed | null;
  };
  persona: CasaPazReportExportPerson | null;
}

export interface CasaPazReportExportResponse {
  generatedAt: string;
  scope: CasaPazReportResponse['scope'];
  filters: CasaPazReportResponse['filters'];
  rows: CasaPazReportExportRow[];
}

export interface CasaPazReportExportParams {
  month?: string;
  fecha?: string;
}

const EXPORT_COLUMNS = [
  'Fecha de asistencia',
  'ID de registro',
  'ID de Casa de Paz',
  'Casa de Paz',
  'Direccion de la casa',
  'Dia de registro',
  'Estado de la Casa de Paz',
  'ID de red de la Casa de Paz',
  'Red de la Casa de Paz',
  'ID de persona',
  'Nombres',
  'Apellidos',
  'Tipo de documento',
  'Documento',
  'Celular',
  'Edad',
  'Genero',
  'Direccion de la persona',
  'Correo',
  'Barrio',
  'Departamento',
  'Ciudad',
  'Fecha de nacimiento',
  'Encuentro',
  'ID de red de la persona',
  'Red de la persona',
  'Es nuevo',
] as const;

type CasaPazExportColumn = (typeof EXPORT_COLUMNS)[number];
type CasaPazExportSheetRow = Record<CasaPazExportColumn, string | number>;

function formatBoolean(value: boolean | null | undefined) {
  if (value === null || value === undefined) {
    return '';
  }

  return value ? 'Si' : 'No';
}

function formatNullable(value: string | number | null | undefined) {
  return value ?? '';
}

function sortCasaPazReportExportRows(rows: CasaPazReportExportRow[]) {
  return [...rows].sort((left, right) => {
    const dateOrder = left.fechaRegistro.localeCompare(right.fechaRegistro);
    if (dateOrder !== 0) {
      return dateOrder;
    }

    const linkOrder = left.asistencia.nombre.localeCompare(right.asistencia.nombre);
    if (linkOrder !== 0) {
      return linkOrder;
    }

    return left.idRegistro.localeCompare(right.idRegistro);
  });
}

export function mapCasaPazReportExportRows(
  rows: CasaPazReportExportRow[],
): CasaPazExportSheetRow[] {
  return sortCasaPazReportExportRows(rows).map((row) => {
    const persona = row.persona;

    return {
      'Fecha de asistencia': row.fechaRegistro,
      'ID de registro': row.idRegistro,
      'ID de Casa de Paz': row.asistencia.id,
      'Casa de Paz': row.asistencia.nombre,
      'Direccion de la casa': row.asistencia.direccionCasa,
      'Dia de registro': row.asistencia.diaRegistro,
      'Estado de la Casa de Paz': row.asistencia.estado,
      'ID de red de la Casa de Paz': row.asistencia.red?.id ?? '',
      'Red de la Casa de Paz': row.asistencia.red?.nombre ?? '',
      'ID de persona': persona?.id ?? '',
      Nombres: persona?.nombres ?? '',
      Apellidos: persona?.apellidos ?? '',
      'Tipo de documento': persona?.tipoDocumento ?? '',
      Documento: persona?.documento ?? '',
      Celular: persona?.celular ?? '',
      Edad: formatNullable(persona?.edad),
      Genero: persona?.genero ?? '',
      'Direccion de la persona': persona?.direccion ?? '',
      Correo: persona?.correo ?? '',
      Barrio: persona?.barrio ?? '',
      Departamento: persona?.departamento ?? '',
      Ciudad: persona?.ciudad ?? '',
      'Fecha de nacimiento': persona?.fechaNacimiento ?? '',
      Encuentro: formatBoolean(persona?.encuentro),
      'ID de red de la persona': persona?.red?.id ?? '',
      'Red de la persona': persona?.red?.nombre ?? '',
      'Es nuevo': formatBoolean(row.esNuevo),
    };
  });
}

function buildSummaryRows(report: CasaPazReportExportResponse) {
  const rows = sortCasaPazReportExportRows(report.rows);
  const attendanceDates = rows.map((row) => row.fechaRegistro);
  const uniquePeople = new Set(
    rows
      .map((row) => row.persona?.id)
      .filter((id): id is string => Boolean(id)),
  );
  const uniqueLinks = new Set(rows.map((row) => row.asistencia.id));
  const scopeLabel =
    report.scope === 'global'
      ? 'Global'
      : report.scope === 'scoped'
        ? 'Segun acceso'
        : 'Por enlace';

  return [
    ['Campo', 'Valor'],
    ['Alcance', scopeLabel],
    ['Mes', report.filters.month ?? ''],
    ['Fecha', report.filters.fecha ?? ''],
    ['Generado', report.generatedAt],
    ['Registros de asistencia', rows.length],
    ['Personas unicas', uniquePeople.size],
    ['Registros nuevos', rows.filter((row) => row.esNuevo).length],
    ['Casas de Paz', uniqueLinks.size],
    ['Primera fecha', attendanceDates[0] ?? ''],
    ['Ultima fecha', attendanceDates[attendanceDates.length - 1] ?? ''],
  ];
}

export function buildCasaPazReportWorkbook(
  report: CasaPazReportExportResponse,
) {
  const rowSheetRows = mapCasaPazReportExportRows(report.rows);
  const rowSheet = XLSX.utils.aoa_to_sheet([
    [...EXPORT_COLUMNS],
    ...rowSheetRows.map((row) => EXPORT_COLUMNS.map((column) => row[column])),
  ]);
  rowSheet['!cols'] = EXPORT_COLUMNS.map((column) => ({
    wch: Math.min(Math.max(column.length + 2, 14), 30),
  }));

  const summarySheet = XLSX.utils.aoa_to_sheet(buildSummaryRows(report));
  summarySheet['!cols'] = [{ wch: 28 }, { wch: 28 }];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, rowSheet, 'Asistencias');
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumen');
  return workbook;
}

export function buildCasaPazReportExportParams(
  report: CasaPazReportResponse,
): CasaPazReportExportParams {
  if (!report.filters.month && !report.filters.fecha) {
    throw new Error('Selecciona un mes o una fecha antes de exportar');
  }

  return {
    month: report.filters.month ?? undefined,
    fecha: report.filters.fecha ?? undefined,
  };
}

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

export function buildCasaPazReportFilename(
  report: CasaPazReportExportResponse,
) {
  const linkNames = Array.from(
    new Set(report.rows.map((row) => row.asistencia.nombre).filter(Boolean)),
  );
  const subject =
    report.filters.asistenciaId && linkNames.length === 1
      ? slugify(linkNames[0])
      : 'alcance';
  const period = report.filters.month ?? report.filters.fecha ?? 'periodo';

  return `reporte-casa-de-paz-${subject}-${period}.xlsx`;
}

export function downloadCasaPazReport(report: CasaPazReportExportResponse) {
  const workbook = buildCasaPazReportWorkbook(report);
  XLSX.writeFileXLSX(workbook, buildCasaPazReportFilename(report));
}
