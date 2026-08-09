import ExcelJS, {
  type Cell,
  type Row,
  type Workbook,
  type Worksheet,
} from 'exceljs';

export interface RedCensoRow {
  nombres: string | null;
  apellidos: string | null;
  documento: string | null;
  celular: string | null;
  fechaNacimiento: string | null;
  correo: string | null;
  encuentro: boolean | null;
}

export interface RedCensoReport {
  redId: string;
  redNombre: string;
  rows: RedCensoRow[];
}

export const RED_CENSO_HEADERS = [
  '#',
  'Nombre Completo',
  'Distrito',
  'C.C.',
  '# Celular',
  'Fecha Nacimiento',
  'Correo Electronico',
  'Nivel',
  'Nombre Casa de Paz ',
  'Posicion en Casa de Paz',
  'Brefos I       pre-encuentro',
  'Brefos II    Habba Patter',
  'Nephios I         Bautizados',
  'Nephios II Fundamentos',
  'Paidion Nuevo',
  'Paidion Antiguo',
  'Asistio a Encuentro?',
  'Bautizado en nuestra Iglesia?',
  'Asiste a Discupulados',
  'Asiste a Intersecion',
  'Asiste todos los domingos a culto?',
  'Observaciones',
] as const;

export const RED_CENSO_TEMPLATE_URL = '/templates/LECJ-Censo-template.xlsx';

const RED_CENSO_TITLE_CELL = 'E1';
const RED_CENSO_GROUP_HEADING_CELL = 'L3';
const RED_CENSO_GROUP_MERGE = 'L3:Q3';
const RED_CENSO_HEADER_ROW = 4;
const RED_CENSO_DATA_START_ROW = 5;
const RED_CENSO_FIRST_COLUMN = 2;
const RED_CENSO_LAST_COLUMN =
  RED_CENSO_FIRST_COLUMN + RED_CENSO_HEADERS.length - 1;

type RedCensoColumn = (typeof RED_CENSO_HEADERS)[number];
type RedCensoSheetRow = Record<RedCensoColumn, string | number>;
type RedCensoTemplateData = ArrayBuffer | Uint8Array;
type ExcelJsLoadBuffer = Parameters<Workbook['xlsx']['load']>[0];

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

function formatFullName(row: RedCensoRow) {
  return formatText(
    [row.nombres, row.apellidos]
      .map((value) => value?.trim() ?? '')
      .filter(Boolean)
      .join(' '),
  );
}

export function mapRedCensoRows(
  report: Pick<RedCensoReport, 'redNombre' | 'rows'>,
): RedCensoSheetRow[] {
  const redName = formatText(report.redNombre);

  return report.rows.map((row, index) => ({
    '#': index + 1,
    'Nombre Completo': formatFullName(row),
    Distrito: redName,
    'C.C.': formatText(row.documento),
    '# Celular': formatText(row.celular),
    'Fecha Nacimiento': formatText(row.fechaNacimiento),
    'Correo Electronico': formatText(row.correo),
    Nivel: '',
    'Nombre Casa de Paz ': '',
    'Posicion en Casa de Paz': '',
    'Brefos I       pre-encuentro': '',
    'Brefos II    Habba Patter': '',
    'Nephios I         Bautizados': '',
    'Nephios II Fundamentos': '',
    'Paidion Nuevo': '',
    'Paidion Antiguo': '',
    'Asistio a Encuentro?': formatBoolean(row.encuentro),
    'Bautizado en nuestra Iglesia?': '',
    'Asiste a Discupulados': '',
    'Asiste a Intersecion': '',
    'Asiste todos los domingos a culto?': '',
    Observaciones: '',
  }));
}

function buildSheetName(redName: string) {
  const normalized = redName
    .replace(/[\\/:?*\[\]]/g, '-')
    .replace(/^'+|'+$/g, '')
    .trim();

  return (`LECJ -Censo ${normalized || 'Red'}`).slice(0, 31);
}

async function getTemplateData(templateData?: RedCensoTemplateData) {
  if (templateData) {
    return templateData;
  }

  const response = await fetch(RED_CENSO_TEMPLATE_URL);
  if (!response.ok) {
    throw new Error(
      `No se pudo cargar la plantilla del censo (${response.status}).`,
    );
  }

  return response.arrayBuffer();
}

function copyCellStyle(source: Cell, target: Cell) {
  target.style = { ...source.style };
}

function copyDataRowTemplate(source: Row, target: Row) {
  target.height = source.height;

  for (
    let column = RED_CENSO_FIRST_COLUMN;
    column <= RED_CENSO_LAST_COLUMN;
    column += 1
  ) {
    copyCellStyle(source.getCell(column), target.getCell(column));
  }
}

function clearTemplateDataRows(worksheet: Worksheet) {
  for (
    let rowNumber = RED_CENSO_DATA_START_ROW;
    rowNumber <= worksheet.rowCount;
    rowNumber += 1
  ) {
    for (
      let column = RED_CENSO_FIRST_COLUMN;
      column <= RED_CENSO_LAST_COLUMN;
      column += 1
    ) {
      worksheet.getCell(rowNumber, column).value = null;
    }
  }
}

function setTemplateHeaders(worksheet: Worksheet) {
  RED_CENSO_HEADERS.forEach((header, index) => {
    worksheet.getCell(RED_CENSO_HEADER_ROW, RED_CENSO_FIRST_COLUMN + index).value =
      header;
  });
}

function populateTemplate(
  worksheet: Worksheet,
  report: RedCensoReport,
  date: Date,
) {
  const redName = report.redNombre.trim() || report.redId;
  const year = date.toISOString().slice(0, 4);
  const mappedRows = mapRedCensoRows({ redNombre: redName, rows: report.rows });
  const templateDataRow = worksheet.getRow(RED_CENSO_DATA_START_ROW);

  worksheet.name = buildSheetName(redName);
  worksheet.getCell(RED_CENSO_TITLE_CELL).value = formatText(
    `LECJ- ${redName} - Censo ${year}`,
  );
  worksheet.getCell(RED_CENSO_GROUP_HEADING_CELL).value = 'Nivel  Escuelas';
  setTemplateHeaders(worksheet);
  clearTemplateDataRows(worksheet);

  mappedRows.forEach((mappedRow, index) => {
    const row = worksheet.getRow(RED_CENSO_DATA_START_ROW + index);
    copyDataRowTemplate(templateDataRow, row);

    RED_CENSO_HEADERS.forEach((header, columnIndex) => {
      row.getCell(RED_CENSO_FIRST_COLUMN + columnIndex).value =
        mappedRow[header];
    });
  });
}

export async function buildRedCensoWorkbook(
  report: RedCensoReport,
  date: Date = new Date(),
  templateData?: RedCensoTemplateData,
) {
  const workbook = new ExcelJS.Workbook();
  const data = await getTemplateData(templateData);
  await workbook.xlsx.load(data as ExcelJsLoadBuffer);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error('La plantilla del censo no contiene hojas.');
  }

  if (!worksheet.model.merges.includes(RED_CENSO_GROUP_MERGE)) {
    throw new Error(`La plantilla del censo debe conservar ${RED_CENSO_GROUP_MERGE}.`);
  }

  populateTemplate(worksheet, report, date);
  return workbook;
}

function slugify(value: string) {
  return (
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase() || 'red'
  );
}

export function buildRedCensoFilename(
  report: Pick<RedCensoReport, 'redId' | 'redNombre'>,
  date: Date = new Date(),
) {
  const redName = report.redNombre.trim() || report.redId;
  return `censo-${slugify(redName)}-${date.toISOString().slice(0, 10)}.xlsx`;
}

export async function downloadRedCenso(
  report: RedCensoReport,
  date: Date = new Date(),
) {
  const workbook = await buildRedCensoWorkbook(report, date);
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = buildRedCensoFilename(report, date);
  link.click();
  window.setTimeout(() => window.URL.revokeObjectURL(url), 0);
}
