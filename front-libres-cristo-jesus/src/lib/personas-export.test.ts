import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as XLSX from 'xlsx';
import {
  buildPersonasFilename,
  buildPersonasWorkbook,
  mapPersonasExportRows,
  type PersonaExportRow,
} from './personas-export.ts';

const buildRow = (
  overrides: Partial<PersonaExportRow> = {},
): PersonaExportRow => ({
  id: 'persona-1',
  nombres: 'Ana',
  apellidos: 'Pérez',
  edad: 31,
  celular: '3001234567',
  tipoDocumento: 'C.C',
  documento: '123',
  genero: 'FEMENINO',
  direccion: 'Calle 1',
  correo: 'ana@example.com',
  encuentro: true,
  barrio: 'Centro',
  departamento: 'Cundinamarca',
  ciudad: 'Bogotá',
  fechaNacimiento: '1995-01-01',
  idRed: 'red-1',
  redNombre: 'Red Norte',
  invitadoPorId: 'persona-2',
  invitadoPorNombre: 'Luis Gómez',
  fechaCreacion: '2026-07-01T00:00:00.000Z',
  fechaModificacion: '2026-07-02T00:00:00.000Z',
  ...overrides,
});

test('maps every safe field to stable Spanish columns without roles', () => {
  const mapped = mapPersonasExportRows([
    buildRow(),
    buildRow({ id: 'persona-2', nombres: null, edad: null, encuentro: null }),
  ]);

  assert.equal(mapped.length, 2);
  assert.equal(Object.keys(mapped[0]).length, 21);
  assert.equal(mapped[0].Nombres, 'Ana');
  assert.equal(mapped[0]['Red'], 'Red Norte');
  assert.equal(mapped[1].Nombres, '');
  assert.equal(mapped[1].Edad, '');
  assert.equal(mapped[1].Encuentro, '');
  assert.ok(!Object.keys(mapped[0]).some((column) => /rol/i.test(column)));
});

test('protects user-controlled values from spreadsheet formula injection', () => {
  const [mapped] = mapPersonasExportRows([
    buildRow({
      nombres: '=HYPERLINK("https://example.com")',
      apellidos: '+command',
      documento: '-123',
      ciudad: '@formula',
    }),
  ]);

  assert.equal(mapped.Nombres, "'=HYPERLINK(\"https://example.com\")");
  assert.equal(mapped.Apellidos, "'+command");
  assert.equal(mapped.Documento, "'-123");
  assert.equal(mapped.Ciudad, "'@formula");
});

test('builds one Personas sheet containing all rows and no role headers', () => {
  const workbook = buildPersonasWorkbook([
    buildRow(),
    buildRow({ id: 'persona-2' }),
  ]);
  const sheet = workbook.Sheets['Personas'];
  const data = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 });

  assert.equal(data.length, 3);
  assert.equal(data[0].length, 21);
  assert.equal(data[1].length, 21);
  assert.equal(data[2][0], 'persona-2');
  assert.ok(!data[0].some((column) => /rol/i.test(column)));
});

test('uses a date-based filename', () => {
  assert.equal(
    buildPersonasFilename(new Date('2026-07-22T12:00:00.000Z')),
    'personas-2026-07-22.xlsx',
  );
});
