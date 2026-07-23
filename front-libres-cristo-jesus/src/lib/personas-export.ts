import * as XLSX from 'xlsx';
import type { AxiosInstance } from 'axios';

export interface PersonaExportRow {
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
  barrio: string | null;
  departamento: string | null;
  ciudad: string | null;
  fechaNacimiento: string | null;
  idRed: string | null;
  redNombre: string | null;
  invitadoPorId: string | null;
  invitadoPorNombre: string | null;
  fechaCreacion: string | null;
  fechaModificacion: string | null;
}

export interface PersonasExportResponse {
  rows: PersonaExportRow[];
}

const EXPORT_COLUMNS = [
  'ID',
  'Nombres',
  'Apellidos',
  'Edad',
  'Celular',
  'Tipo de documento',
  'Documento',
  'Género',
  'Dirección',
  'Correo',
  'Encuentro',
  'Barrio',
  'Departamento',
  'Ciudad',
  'Fecha de nacimiento',
  'ID de red',
  'Red',
  'ID de invitador',
  'Invitado por',
  'Fecha de creación',
  'Fecha de modificación',
] as const;

type PersonaExportColumn = (typeof EXPORT_COLUMNS)[number];
type PersonaExportSheetRow = Record<PersonaExportColumn, string | number>;

function formatText(value: string | null | undefined) {
  const text = value ?? '';
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

function formatBoolean(value: boolean | null | undefined) {
  if (value === null || value === undefined) {
    return '';
  }

  return value ? 'Sí' : 'No';
}

export function mapPersonasExportRows(
  rows: PersonaExportRow[],
): PersonaExportSheetRow[] {
  return rows.map((row) => ({
    ID: formatText(row.id),
    Nombres: formatText(row.nombres),
    Apellidos: formatText(row.apellidos),
    Edad: row.edad ?? '',
    Celular: formatText(row.celular),
    'Tipo de documento': formatText(row.tipoDocumento),
    Documento: formatText(row.documento),
    'Género': formatText(row.genero),
    'Dirección': formatText(row.direccion),
    Correo: formatText(row.correo),
    Encuentro: formatBoolean(row.encuentro),
    Barrio: formatText(row.barrio),
    Departamento: formatText(row.departamento),
    Ciudad: formatText(row.ciudad),
    'Fecha de nacimiento': formatText(row.fechaNacimiento),
    'ID de red': formatText(row.idRed),
    Red: formatText(row.redNombre),
    'ID de invitador': formatText(row.invitadoPorId),
    'Invitado por': formatText(row.invitadoPorNombre),
    'Fecha de creación': formatText(row.fechaCreacion),
    'Fecha de modificación': formatText(row.fechaModificacion),
  }));
}

export function buildPersonasWorkbook(rows: PersonaExportRow[]) {
  const sheetRows = mapPersonasExportRows(rows);
  const sheet = XLSX.utils.aoa_to_sheet([
    [...EXPORT_COLUMNS],
    ...sheetRows.map((row) => EXPORT_COLUMNS.map((column) => row[column])),
  ]);
  sheet['!cols'] = EXPORT_COLUMNS.map((column) => ({
    wch: Math.min(Math.max(column.length + 2, 14), 30),
  }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Personas');
  return workbook;
}

export function buildPersonasFilename(date: Date = new Date()) {
  return `personas-${date.toISOString().slice(0, 10)}.xlsx`;
}

export function downloadPersonas(rows: PersonaExportRow[]) {
  XLSX.writeFileXLSX(buildPersonasWorkbook(rows), buildPersonasFilename());
}

export async function handlePersonasExport(apiClient: AxiosInstance) {
  const { data } = await apiClient.get<PersonasExportResponse>(
    '/personas/export-rows',
  );

  downloadPersonas(data.rows);
}
