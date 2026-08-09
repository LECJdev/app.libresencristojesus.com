import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import ExcelJS, { type Workbook } from 'exceljs';
import {
  buildRedCensoFilename,
  buildRedCensoWorkbook,
  mapRedCensoRows,
  RED_CENSO_HEADERS,
  type RedCensoRow,
} from './red-censo-report-export.ts';

type ExcelJsLoadBuffer = Parameters<Workbook['xlsx']['load']>[0];

const TEMPLATE_URL = new URL(
  '../../public/templates/LECJ-Censo-template.xlsx',
  import.meta.url,
);

const buildRow = (overrides: Partial<RedCensoRow> = {}): RedCensoRow => ({
  nombres: 'Ana',
  apellidos: 'Pérez',
  documento: '123456',
  celular: '3001234567',
  fechaNacimiento: '1995-01-01',
  correo: 'ana@example.com',
  encuentro: true,
  ...overrides,
});

async function loadTemplateData() {
  return readFile(TEMPLATE_URL);
}

async function loadTemplateWorkbook() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(
    (await loadTemplateData()) as unknown as ExcelJsLoadBuffer,
  );
  return workbook;
}

async function roundTrip(workbook: Workbook) {
  const buffer = await workbook.xlsx.writeBuffer();
  const output = new ExcelJS.Workbook();
  await output.xlsx.load(buffer);
  return output;
}

function assertCellEmpty(workbook: Workbook, address: string) {
  assert.equal(workbook.worksheets[0]?.getCell(address).value ?? '', '');
}

test('uses the template table coordinates and preserves its visual elements', async () => {
  const template = await loadTemplateWorkbook();
  const templateSheet = template.worksheets[0];
  assert.ok(templateSheet);

  const generated = await buildRedCensoWorkbook(
    {
      redId: 'red-norte',
      redNombre: 'Red Norte',
      rows: [buildRow(), buildRow({ nombres: null, apellidos: null })],
    },
    new Date('2026-07-22T12:00:00.000Z'),
    await loadTemplateData(),
  );
  const workbook = await roundTrip(generated);
  const sheet = workbook.worksheets[0];
  assert.ok(sheet);

  assert.equal(sheet.name, 'LECJ -Censo Red Norte');
  assert.equal(sheet.getCell('E1').value, 'LECJ- Red Norte - Censo 2026');
  assert.equal(sheet.getCell('L3').value, 'Nivel  Escuelas');
  assert.ok(sheet.model.merges.includes('L3:Q3'));
  assert.deepEqual(
    RED_CENSO_HEADERS.map((_, index) =>
      sheet.getCell(4, index + 2).value,
    ),
    RED_CENSO_HEADERS,
  );

  assert.equal(sheet.getCell('B5').value, 1);
  assert.equal(sheet.getCell('C5').value, 'Ana Pérez');
  assert.equal(sheet.getCell('D5').value, 'Red Norte');
  assert.equal(sheet.getCell('E5').value, '123456');
  assert.equal(sheet.getCell('F5').value, '3001234567');
  assert.equal(sheet.getCell('G5').value, '1995-01-01');
  assert.equal(sheet.getCell('H5').value, 'ana@example.com');
  assert.equal(sheet.getCell('R5').value, 'Sí');
  assertCellEmpty(workbook, 'I5');
  assertCellEmpty(workbook, 'J5');
  assertCellEmpty(workbook, 'W5');
  assert.equal(sheet.getCell('B6').value, 2);
  assertCellEmpty(workbook, 'C6');
  assert.equal(sheet.getCell('D6').value, 'Red Norte');

  assert.equal(sheet.getImages().length, templateSheet.getImages().length);
  assert.ok(sheet.getImages().length > 0);
  assert.deepEqual(sheet.getCell('B4').fill, templateSheet.getCell('B4').fill);
  assert.deepEqual(sheet.getCell('B4').font, templateSheet.getCell('B4').font);
  assert.deepEqual(
    sheet.getCell('B4').border,
    templateSheet.getCell('B4').border,
  );
  assert.deepEqual(sheet.getCell('B5').style, templateSheet.getCell('B5').style);
  assert.equal(sheet.getRow(5).height, templateSheet.getRow(5).height);
  assert.equal(sheet.getRow(6).height, templateSheet.getRow(5).height);
  assert.equal(sheet.getColumn(2).width, templateSheet.getColumn(2).width);
  assert.deepEqual(sheet.pageSetup.margins, templateSheet.pageSetup.margins);
  assert.deepEqual(sheet.views[0], templateSheet.views[0]);
});

test('removes stale template sample values and creates a valid empty export', async () => {
  const generated = await buildRedCensoWorkbook(
    { redId: 'red-vacia', redNombre: 'Red Vacía', rows: [] },
    new Date('2026-07-22T12:00:00.000Z'),
    await loadTemplateData(),
  );
  const workbook = await roundTrip(generated);
  const sheet = workbook.worksheets[0];
  assert.ok(sheet);

  for (let row = 5; row <= sheet.rowCount; row += 1) {
    for (let column = 2; column <= 23; column += 1) {
      assert.equal(sheet.getCell(row, column).value ?? '', '');
    }
  }

  assert.equal(sheet.getCell('E1').value, 'LECJ- Red Vacía - Censo 2026');
  assert.ok(sheet.model.merges.includes('L3:Q3'));
  assert.ok(sheet.getImages().length > 0);
});

test('keeps unsupported census fields empty', () => {
  const [mapped] = mapRedCensoRows({
    redNombre: 'Red Norte',
    rows: [
      buildRow({
        nombres: null,
        apellidos: null,
        documento: null,
        celular: null,
        fechaNacimiento: null,
        correo: null,
        encuentro: null,
      }),
    ],
  });

  assert.equal(mapped['Nombre Completo'], '');
  assert.equal(mapped.Distrito, 'Red Norte');
  assert.equal(mapped['C.C.'], '');
  assert.equal(mapped['# Celular'], '');
  assert.equal(mapped['Fecha Nacimiento'], '');
  assert.equal(mapped['Correo Electronico'], '');
  assert.equal(mapped['Asistio a Encuentro?'], '');
  assert.equal(mapped['Nombre Casa de Paz '], '');
  assert.equal(mapped['Posicion en Casa de Paz'], '');
  assert.equal(mapped.Observaciones, '');
});

test('escapes formula-like values in the generated workbook', async () => {
  const generated = await buildRedCensoWorkbook(
    {
      redId: 'red-norte',
      redNombre: '+Red Norte',
      rows: [
        buildRow({
          nombres: '=HYPERLINK("https://example.com")',
          apellidos: '+command',
          documento: '-123456',
          celular: '@phone',
          correo: '=formula@example.com',
        }),
      ],
    },
    new Date('2026-07-22T12:00:00.000Z'),
    await loadTemplateData(),
  );
  const workbook = await roundTrip(generated);
  const sheet = workbook.worksheets[0];
  assert.ok(sheet);

  assert.equal(sheet.getCell('D5').value, "'+Red Norte");
  assert.equal(
    sheet.getCell('C5').value,
    "'=HYPERLINK(\"https://example.com\") +command",
  );
  assert.equal(sheet.getCell('E5').value, "'-123456");
  assert.equal(sheet.getCell('F5').value, "'@phone");
  assert.equal(sheet.getCell('H5').value, "'=formula@example.com");
});

test('uses the selected Red and current date in the filename', () => {
  assert.equal(
    buildRedCensoFilename(
      { redId: 'red-1', redNombre: 'Red Norte Bogotá' },
      new Date('2026-07-22T12:00:00.000Z'),
    ),
    'censo-red-norte-bogota-2026-07-22.xlsx',
  );
});
