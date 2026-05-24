import { BadRequestException } from '@nestjs/common';
import {
  normalizeAttendanceDateOrThrow,
  normalizeOptionalAttendanceDateOrThrow,
} from './attendance-date.util';

describe('attendance-date.util', () => {
  it('normalizes date-only strings', () => {
    expect(normalizeAttendanceDateOrThrow('2026-05-23')).toBe('2026-05-23');
  });

  it('normalizes datetime strings to date-only', () => {
    expect(normalizeAttendanceDateOrThrow('2026-05-23T14:30:00.000Z')).toBe(
      '2026-05-23',
    );
  });

  it('normalizes Date instances returned by the database', () => {
    expect(
      normalizeAttendanceDateOrThrow(new Date('2026-05-23T00:00:00.000Z')),
    ).toBe('2026-05-23');
  });

  it('normalizes date-like objects with toISOString', () => {
    expect(
      normalizeAttendanceDateOrThrow({
        toISOString: () => '2026-05-23T18:45:00.000Z',
      }),
    ).toBe('2026-05-23');
  });

  it('returns undefined for empty optional values', () => {
    expect(normalizeOptionalAttendanceDateOrThrow('')).toBeUndefined();
    expect(normalizeOptionalAttendanceDateOrThrow(undefined)).toBeUndefined();
    expect(normalizeOptionalAttendanceDateOrThrow(null)).toBeUndefined();
  });

  it('throws for unsupported values', () => {
    expect(() =>
      normalizeAttendanceDateOrThrow(123 as unknown as string),
    ).toThrow(BadRequestException);
  });
});
