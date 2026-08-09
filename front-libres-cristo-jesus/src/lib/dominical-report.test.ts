import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildDominicalDonutGradient,
  buildDominicalMatrixRows,
  buildDominicalRedSegments,
  getDominicalMonthRange,
  type DominicalReportResponse,
} from './dominical-report.ts';

function buildReport(): DominicalReportResponse {
  return {
    generatedAt: '2026-01-01T00:00:00.000Z',
    asistencia: {
      id: 'asistencia-1',
      nombre: 'Domingo Norte',
      estado: 'ACTIVO',
      diaRegistro: 'DOMINGO',
      sede: { id: 'sede-1', nombre: 'Sede Norte' },
    },
    filters: { monthFrom: '2026-01', monthTo: '2026-01' },
    attendanceByDate: [
      { fecha: '2026-01-11', totalAsistentes: 1, totalNuevos: 0 },
      { fecha: '2026-01-04', totalAsistentes: 2, totalNuevos: 1 },
    ],
    attendanceByRed: [
      { idRed: 'red-1', nombreRed: 'Red Norte', totalAsistentes: 2 },
      { idRed: null, nombreRed: null, totalAsistentes: 1 },
    ],
    people: [
      {
        id: 'persona-1',
        nombres: 'Ana',
        apellidos: 'Pérez',
        attendanceByDate: { '2026-01-04': true },
      },
      {
        id: 'persona-2',
        nombres: 'Luis',
        apellidos: 'Gómez',
        attendanceByDate: { '2026-01-11': true },
      },
    ],
  };
}

test('builds chronological matrix columns and explicit absent markers', () => {
  const rows = buildDominicalMatrixRows(buildReport());

  assert.deepEqual(rows.map((row) => row.rowNumber), [1, 2]);
  assert.deepEqual(rows[0]?.attendance, [true, false]);
  assert.deepEqual(rows[1]?.attendance, [false, true]);
});

test('keeps the unassigned Red bucket in donut transformations', () => {
  const segments = buildDominicalRedSegments(buildReport());

  assert.equal(segments[1]?.label, 'Sin Red asignada');
  assert.equal(segments[0]?.percentage, (2 / 3) * 100);
  assert.match(buildDominicalDonutGradient(segments), /conic-gradient/);
});

test('derives the inclusive month range from recorded dates', () => {
  assert.deepEqual(
    getDominicalMonthRange(['2026-03-01', '2026-01-04', '2026-02-08']),
    { monthFrom: '2026-01', monthTo: '2026-03' },
  );
  assert.equal(getDominicalMonthRange([]), null);
});
