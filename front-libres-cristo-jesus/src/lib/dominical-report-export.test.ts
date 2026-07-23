import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as XLSX from 'xlsx';
import {
  buildDominicalAttendanceFilename,
  buildDominicalAttendanceWorkbook,
  mapDominicalAttendanceExportRows,
  sortDominicalAttendanceExportRows,
  type DominicalAttendanceExportRow,
} from './dominical-report-export.ts';

const buildRow = (
  overrides: Partial<DominicalAttendanceExportRow> = {},
): DominicalAttendanceExportRow => ({
  idRegistro: 'registro-1',
  fechaRegistro: '2026-06-13',
  esNuevo: false,
  asistenciaId: 'asistencia-1',
  asistenciaNombre: 'Domingo Norte',
  sede: 'Sede Norte',
  diaRegistro: 'DOMINGO',
  estado: 'ACTIVO',
  redId: 'red-1',
  redNombre: 'Red Norte',
  personaId: 'persona-1',
  nombres: 'Ana',
  apellidos: 'Perez',
  tipoDocumento: 'CC',
  documento: '123',
  celular: '3001234567',
  edad: 31,
  genero: 'FEMENINO',
  direccion: 'Calle 123',
  correo: 'ana@example.com',
  barrio: 'Centro',
  departamento: 'Cundinamarca',
  ciudad: 'Bogota',
  fechaNacimiento: '1990-01-01',
  ...overrides,
});

test('maps 24 flat columns and preserves empty cells for null values', () => {
  const mapped = mapDominicalAttendanceExportRows([
    buildRow(),
    buildRow({
      idRegistro: 'registro-2',
      personaId: null,
      tipoDocumento: null,
      documento: null,
      celular: null,
      edad: null,
      genero: null,
      direccion: null,
      correo: null,
      barrio: null,
      departamento: null,
      ciudad: null,
      fechaNacimiento: null,
      redId: null,
      redNombre: null,
    }),
  ]);

  assert.equal(mapped.length, 2);
  assert.equal(Object.keys(mapped[0]).length, 24);
  assert.equal(mapped[0]['ID de registro'], 'registro-1');
  assert.equal(mapped[0]['Nombre de asistencia'], 'Domingo Norte');
  assert.equal(mapped[0]['Es nuevo'], 'No');
  assert.equal(mapped[1]['ID de persona'], '');
  assert.equal(mapped[1]['Documento'], '');
  assert.equal(mapped[1]['Celular'], '');
  assert.equal(mapped[1]['Red'], '');
  assert.equal(mapped[1]['Edad'], '');
  assert.equal(mapped[1]['Correo'], '');
});

test('orders multi-month rows by ascending date, surname, name, and registration ID', () => {
  const rows = [
    buildRow({ idRegistro: 'registro-3', fechaRegistro: '2026-06-13' }),
    buildRow({ idRegistro: 'registro-2', fechaRegistro: '2026-05-23' }),
    buildRow({ idRegistro: 'registro-1', fechaRegistro: '2026-04-10' }),
  ];

  const mapped = mapDominicalAttendanceExportRows(rows);

  assert.equal(mapped.length, 3);
  assert.equal(mapped[0]['Fecha de registro'], '2026-04-10');
  assert.equal(mapped[1]['Fecha de registro'], '2026-05-23');
  assert.equal(mapped[2]['Fecha de registro'], '2026-06-13');
});

test('produces a deterministic stable order for the same input', () => {
  const rows = [
    buildRow({ idRegistro: 'registro-2', fechaRegistro: '2026-05-23' }),
    buildRow({ idRegistro: 'registro-1', fechaRegistro: '2026-04-10' }),
    buildRow({ idRegistro: 'registro-3', fechaRegistro: '2026-06-13' }),
  ];

  const first = sortDominicalAttendanceExportRows(rows);
  const second = sortDominicalAttendanceExportRows(rows);

  assert.equal(
    JSON.stringify(first.map((row) => row.idRegistro)),
    JSON.stringify(second.map((row) => row.idRegistro)),
  );
  assert.equal(first[0].idRegistro, 'registro-1');
  assert.equal(first[2].idRegistro, 'registro-3');
});

test('workbook contains Asistencia and Resumen sheets', () => {
  const workbook = buildDominicalAttendanceWorkbook([buildRow()]);

  assert.ok(workbook.Sheets['Asistencia']);
  assert.ok(workbook.Sheets['Resumen']);
  assert.equal(workbook.SheetNames.length, 2);
});

test('produces headers-only workbooks with both sheets when rows are empty', () => {
  const workbook = buildDominicalAttendanceWorkbook([]);
  const asistenciaData = XLSX.utils.sheet_to_json<string[]>(
    workbook.Sheets['Asistencia'],
    { header: 1 },
  );
  const resumenData = XLSX.utils.sheet_to_json<string[]>(
    workbook.Sheets['Resumen'],
    { header: 1 },
  );

  assert.equal(asistenciaData.length, 1);
  assert.equal(asistenciaData[0].length, 24);
  assert.equal(asistenciaData[0][0], 'ID de registro');
  assert.equal(asistenciaData[0][23], 'Fecha de nacimiento');

  assert.equal(resumenData.length, 1);
  assert.deepEqual(resumenData[0], ['Mes', 'Total asistentes', 'Total nuevos']);
});

test('Resumen sheet aggregates monthly totals in ascending order', () => {
  const rows = [
    buildRow({
      idRegistro: 'registro-1',
      fechaRegistro: '2026-05-23',
      esNuevo: false,
    }),
    buildRow({
      idRegistro: 'registro-2',
      fechaRegistro: '2026-05-30',
      esNuevo: true,
    }),
    buildRow({
      idRegistro: 'registro-3',
      fechaRegistro: '2026-06-13',
      esNuevo: false,
    }),
  ];

  const workbook = buildDominicalAttendanceWorkbook(rows);
  const resumenData = XLSX.utils.sheet_to_json<string[]>(
    workbook.Sheets['Resumen'],
    { header: 1 },
  );

  assert.equal(resumenData.length, 3);
  assert.deepEqual(resumenData[0], ['Mes', 'Total asistentes', 'Total nuevos']);
  assert.deepEqual(resumenData[1], ['2026-05', 2, 1]);
  assert.deepEqual(resumenData[2], ['2026-06', 1, 0]);
});

test('filename uses first-to-last date range when rows exist', () => {
  const rows = [
    buildRow({ idRegistro: 'registro-2', fechaRegistro: '2026-05-23' }),
    buildRow({ idRegistro: 'registro-1', fechaRegistro: '2026-04-10' }),
    buildRow({ idRegistro: 'registro-3', fechaRegistro: '2026-06-13' }),
  ];

  const filename = buildDominicalAttendanceFilename('Domingo Norte', rows);

  assert.ok(filename.startsWith('asistencia-dominical-'));
  assert.ok(filename.includes('domingo-norte'));
  assert.ok(filename.includes('2026-04-10-a-2026-06-13'));
  assert.ok(filename.endsWith('.xlsx'));
});

test('filename falls back to historico when no rows exist', () => {
  const filename = buildDominicalAttendanceFilename('Domingo Norte', []);

  assert.equal(filename, 'asistencia-dominical-domingo-norte-historico.xlsx');
});

test('workbook output keeps all 24 columns for populated rows', () => {
  const workbook = buildDominicalAttendanceWorkbook([buildRow()]);
  const sheet = workbook.Sheets['Asistencia'];
  const data = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 });

  assert.equal(data.length, 2);
  assert.equal(data[0].length, 24);
  assert.equal(data[1].length, 24);
  assert.equal(data[1][0], 'registro-1');
  assert.equal(data[1][3], 'asistencia-1');
});
