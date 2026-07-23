import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildCasaPazReportExportParams,
  mapCasaPazReportExportRows,
  type CasaPazReportExportRow,
} from './casa-paz-report-export.ts';
import {
  getCurrentDateValue,
  getCurrentMonthValue,
  type CasaPazReportResponse,
} from './casa-paz-reports.ts';

const buildRow = (
  overrides: Partial<CasaPazReportExportRow> = {},
): CasaPazReportExportRow => ({
  idRegistro: 'registro-1',
  fechaRegistro: '2026-06-23',
  esNuevo: true,
  asistencia: {
    id: 'asistencia-1',
    nombre: 'Casa de Paz Norte',
    estado: 'ACTIVO',
    diaRegistro: 'DOMINGO',
    direccionCasa: 'Calle 123',
    red: { id: 'red-1', nombre: 'Red Norte' },
  },
  persona: {
    id: 'persona-1',
    nombres: 'Ana',
    apellidos: 'Perez',
    tipoDocumento: 'CC',
    documento: '123',
    celular: '3001234567',
    edad: 31,
    genero: null,
    direccion: null,
    correo: null,
    barrio: null,
    departamento: null,
    ciudad: null,
    fechaNacimiento: null,
    encuentro: false,
    red: null,
  },
  ...overrides,
});

test('maps rows in attendance-date and link order without exposing nested objects', () => {
  const mappedRows = mapCasaPazReportExportRows([
    buildRow({
      idRegistro: 'registro-2',
      fechaRegistro: '2026-06-24',
      asistencia: {
        ...buildRow().asistencia,
        id: 'asistencia-2',
        nombre: 'Casa de Paz Sur',
      },
    }),
    buildRow(),
  ]);

  assert.deepEqual(
    mappedRows.map((row) => [row['Fecha de asistencia'], row['Casa de Paz']]),
    [
      ['2026-06-23', 'Casa de Paz Norte'],
      ['2026-06-24', 'Casa de Paz Sur'],
    ],
  );
  assert.equal(mappedRows[0]['Es nuevo'], 'Si');
  assert.equal(mappedRows[0].Documento, '123');
  assert.equal(mappedRows[0]['Red de la persona'], '');
});

test('requires a bounded month or date when building export params', () => {
  const monthlyReport = {
    filters: { month: '2026-06', fecha: null, asistenciaId: 'asistencia-1' },
  } as CasaPazReportResponse;

  assert.deepEqual(buildCasaPazReportExportParams(monthlyReport), {
    month: '2026-06',
    fecha: undefined,
  });

  assert.throws(() =>
    buildCasaPazReportExportParams({
      filters: { month: null, fecha: null, asistenciaId: null },
    } as CasaPazReportResponse),
  );
});

test('uses the Bogota calendar for report defaults near UTC midnight', () => {
  const date = new Date('2026-07-01T04:30:00.000Z');

  assert.equal(getCurrentDateValue(date), '2026-06-30');
  assert.equal(getCurrentMonthValue(date), '2026-06');
});
