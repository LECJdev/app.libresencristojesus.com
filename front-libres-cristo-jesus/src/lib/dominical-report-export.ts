import * as XLSX from 'xlsx';
import type { AxiosInstance } from 'axios';

export interface DominicalAttendanceExportRow {
  idRegistro: string;
  fechaRegistro: string;
  esNuevo: boolean;
  asistenciaId: string;
  asistenciaNombre: string;
  sede: string | null;
  diaRegistro: string;
  estado: string;
  redId: string | null;
  redNombre: string | null;
  personaId: string | null;
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
}

export interface DominicalAttendanceExportResponse {
  rows: DominicalAttendanceExportRow[];
}

const EXPORT_COLUMNS = [
  'ID de registro',
  'Fecha de registro',
  'Es nuevo',
  'ID de asistencia',
  'Nombre de asistencia',
  'Sede',
  'Dia de registro',
  'Estado',
  'ID de red',
  'Red',
  'ID de persona',
  'Nombres',
  'Apellidos',
  'Tipo de documento',
  'Documento',
  'Celular',
  'Edad',
  'Genero',
  'Direccion',
  'Correo',
  'Barrio',
  'Departamento',
  'Ciudad',
  'Fecha de nacimiento',
] as const;

const RESUMEN_COLUMNS = [
  'Mes',
  'Total asistentes',
  'Total nuevos',
] as const;

type DominicalExportColumn = (typeof EXPORT_COLUMNS)[number];
type DominicalExportSheetRow = Record<DominicalExportColumn, string | number>;

function formatNullable(value: string | number | null | undefined) {
  return value ?? '';
}

function formatBoolean(value: boolean | null | undefined) {
  if (value === null || value === undefined) {
    return '';
  }

  return value ? 'Si' : 'No';
}

export function sortDominicalAttendanceExportRows(
  rows: DominicalAttendanceExportRow[],
): DominicalAttendanceExportRow[] {
  return [...rows].sort((left, right) => {
    const dateOrder = left.fechaRegistro.localeCompare(right.fechaRegistro);
    if (dateOrder !== 0) {
      return dateOrder;
    }

    const lastNameOrder = (left.apellidos ?? '').localeCompare(
      right.apellidos ?? '',
    );
    if (lastNameOrder !== 0) {
      return lastNameOrder;
    }

    const firstNameOrder = (left.nombres ?? '').localeCompare(
      right.nombres ?? '',
    );
    if (firstNameOrder !== 0) {
      return firstNameOrder;
    }

    return left.idRegistro.localeCompare(right.idRegistro);
  });
}

function buildMonthlySummaryRows(
  rows: DominicalAttendanceExportRow[],
): Array<[string, number, number]> {
  const totals = new Map<
    string,
    { totalAsistentes: number; totalNuevos: number }
  >();

  for (const row of rows) {
    const mes = row.fechaRegistro.slice(0, 7);
    const entry = totals.get(mes) ?? { totalAsistentes: 0, totalNuevos: 0 };
    entry.totalAsistentes += 1;
    if (row.esNuevo) {
      entry.totalNuevos += 1;
    }
    totals.set(mes, entry);
  }

  const months = Array.from(totals.keys()).sort();
  return months.map((mes) => {
    const entry = totals.get(mes)!;
    return [mes, entry.totalAsistentes, entry.totalNuevos] as [
      string,
      number,
      number,
    ];
  });
}

export function mapDominicalAttendanceExportRows(
  rows: DominicalAttendanceExportRow[],
): DominicalExportSheetRow[] {
  return sortDominicalAttendanceExportRows(rows).map((row) => ({
    'ID de registro': row.idRegistro,
    'Fecha de registro': row.fechaRegistro,
    'Es nuevo': formatBoolean(row.esNuevo),
    'ID de asistencia': row.asistenciaId,
    'Nombre de asistencia': row.asistenciaNombre,
    Sede: row.sede ?? '',
    'Dia de registro': row.diaRegistro,
    Estado: row.estado,
    'ID de red': row.redId ?? '',
    Red: row.redNombre ?? '',
    'ID de persona': row.personaId ?? '',
    Nombres: row.nombres ?? '',
    Apellidos: row.apellidos ?? '',
    'Tipo de documento': row.tipoDocumento ?? '',
    Documento: row.documento ?? '',
    Celular: row.celular ?? '',
    Edad: formatNullable(row.edad),
    Genero: row.genero ?? '',
    Direccion: row.direccion ?? '',
    Correo: row.correo ?? '',
    Barrio: row.barrio ?? '',
    Departamento: row.departamento ?? '',
    Ciudad: row.ciudad ?? '',
    'Fecha de nacimiento': row.fechaNacimiento ?? '',
  }));
}

export function buildDominicalAttendanceWorkbook(
  rows: DominicalAttendanceExportRow[],
) {
  const sheetRows = mapDominicalAttendanceExportRows(rows);
  const sheet = XLSX.utils.aoa_to_sheet([
    [...EXPORT_COLUMNS],
    ...sheetRows.map((row) => EXPORT_COLUMNS.map((column) => row[column])),
  ]);
  sheet['!cols'] = EXPORT_COLUMNS.map((column) => ({
    wch: Math.min(Math.max(column.length + 2, 14), 30),
  }));

  const summaryRows = [
    [...RESUMEN_COLUMNS],
    ...buildMonthlySummaryRows(rows),
  ];
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
  summarySheet['!cols'] = RESUMEN_COLUMNS.map((column) => ({
    wch: Math.min(Math.max(column.length + 2, 14), 30),
  }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Asistencia');
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumen');
  return workbook;
}

export function buildDominicalAttendanceFilename(
  asistenciaNombre: string,
  rows: DominicalAttendanceExportRow[],
): string {
  const slug = asistenciaNombre
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();

  if (rows.length === 0) {
    return `asistencia-dominical-${slug}-historico.xlsx`;
  }

  const sortedRows = sortDominicalAttendanceExportRows(rows);
  const firstDate = sortedRows[0].fechaRegistro;
  const lastDate = sortedRows[sortedRows.length - 1].fechaRegistro;

  return `asistencia-dominical-${slug}-${firstDate}-a-${lastDate}.xlsx`;
}

export function downloadDominicalAttendanceReport(
  rows: DominicalAttendanceExportRow[],
  asistenciaNombre: string,
) {
  const workbook = buildDominicalAttendanceWorkbook(rows);
  XLSX.writeFileXLSX(
    workbook,
    buildDominicalAttendanceFilename(asistenciaNombre, rows),
  );
}

export async function handleDominicalExport(
  apiClient: AxiosInstance,
  id: string,
  asistenciaNombre: string,
): Promise<void> {
  const { data } = await apiClient.get<DominicalAttendanceExportResponse>(
    `/asistencias-dominicales/${id}/registros/export`,
  );

  downloadDominicalAttendanceReport(data.rows, asistenciaNombre);
}
