import { BadRequestException } from '@nestjs/common';

const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const DATE_PREFIX_REGEX = /^(\d{4}-\d{2}-\d{2})(?:$|[T\s].*)/;

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
  value: string,
  label = 'La fecha',
): string {
  const trimmed = value.trim();
  const match = trimmed.match(DATE_PREFIX_REGEX);

  if (!match || !isValidDateOnly(match[1])) {
    throw new BadRequestException(`${label} debe tener formato YYYY-MM-DD`);
  }

  return match[1];
}

export function normalizeOptionalAttendanceDateOrThrow(
  value?: string,
  label = 'La fecha',
): string | undefined {
  if (!value) {
    return undefined;
  }

  return normalizeAttendanceDateOrThrow(value, label);
}
