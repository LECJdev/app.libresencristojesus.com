import { BadRequestException } from '@nestjs/common';

const BOGOTA_TIME_ZONE = 'America/Bogota';
const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const DATE_PREFIX_REGEX = /^(\d{4}-\d{2}-\d{2})(?:$|[T\s].*)/;
const BOGOTA_DATE_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: BOGOTA_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
const BOGOTA_WEEKDAY_FORMATTER = new Intl.DateTimeFormat('en-US', {
  timeZone: BOGOTA_TIME_ZONE,
  weekday: 'short',
});
const WEEKDAY_TO_DAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

type AttendanceDateValue =
  | string
  | Date
  | { toISOString: () => string }
  | null
  | undefined;

function isValidDateOnly(value: string): boolean {
  if (!DATE_ONLY_REGEX.test(value)) {
    return false;
  }

  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

export function normalizeAttendanceDateOrThrow(
  value: AttendanceDateValue,
  label = 'La fecha',
): string {
  const trimmed = coerceAttendanceDateValue(value)?.trim();

  if (!trimmed) {
    throw new BadRequestException(`${label} debe tener formato YYYY-MM-DD`);
  }

  const match = trimmed.match(DATE_PREFIX_REGEX);

  if (!match || !isValidDateOnly(match[1])) {
    throw new BadRequestException(`${label} debe tener formato YYYY-MM-DD`);
  }

  return match[1];
}

export function normalizeOptionalAttendanceDateOrThrow(
  value?: AttendanceDateValue,
  label = 'La fecha',
): string | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  return normalizeAttendanceDateOrThrow(value, label);
}

export function getBogotaDateString(date: Date = new Date()): string {
  const parts = BOGOTA_DATE_FORMATTER.formatToParts(date);
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;

  if (!year || !month || !day) {
    throw new Error('Could not format Bogota date');
  }

  return `${year}-${month}-${day}`;
}

export function getBogotaDayOfWeek(date: Date = new Date()): number {
  const weekday = BOGOTA_WEEKDAY_FORMATTER.formatToParts(date).find(
    (part) => part.type === 'weekday',
  )?.value;

  if (!weekday || !(weekday in WEEKDAY_TO_DAY_INDEX)) {
    throw new Error('Could not format Bogota weekday');
  }

  return WEEKDAY_TO_DAY_INDEX[weekday];
}

function coerceAttendanceDateValue(value: AttendanceDateValue): string | null {
  if (typeof value === 'string') {
    return value;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }

  if (
    value &&
    typeof value === 'object' &&
    'toISOString' in value &&
    typeof value.toISOString === 'function'
  ) {
    const isoString = value.toISOString();
    return typeof isoString === 'string' ? isoString : null;
  }

  return null;
}
