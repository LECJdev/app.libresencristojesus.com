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

export function normalizeAttendanceDate(value: string): string | null {
  const trimmed = value.trim();
  const match = trimmed.match(DATE_PREFIX_REGEX);

  if (!match || !isValidDateOnly(match[1])) {
    return null;
  }

  return match[1];
}

export function normalizeAttendanceDateOptions(values: string[]): string[] {
  return Array.from(
    new Set(
      values
        .map((value) => normalizeAttendanceDate(value))
        .filter((value): value is string => value !== null),
    ),
  );
}
