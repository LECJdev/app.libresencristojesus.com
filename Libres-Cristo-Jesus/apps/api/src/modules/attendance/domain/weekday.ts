/**
 * Maps the Spanish weekday names stored in `MeetingSchedule.meetingDay`
 * onto ISO weekday numbers (Monday = 1 … Sunday = 7).
 *
 * The column is free text — doc04/doc07 never enumerate a closed set — so
 * the lookup is normalised: lowercased and stripped of accents. Without
 * that, "Miércoles" and "Miercoles" would be two different days, and the
 * one typed without the accent would silently fail to resolve.
 */
const ISO_WEEKDAY_BY_NAME: Record<string, number> = {
  lunes: 1,
  martes: 2,
  miercoles: 3,
  jueves: 4,
  viernes: 5,
  sabado: 6,
  domingo: 7,
};

/** Lowercase, accent-free form used as the lookup key. */
function normalise(value: string): string {
  return value.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/**
 * ISO weekday for a stored day name, or `null` when unrecognised.
 *
 * Returns null rather than defaulting to Monday: a schedule with an
 * unreadable day is a data problem the caller must surface, not something
 * to paper over by inventing a meeting on the wrong day.
 */
export function isoWeekdayFromName(dayName: string | null | undefined): number | null {
  if (!dayName) {
    return null;
  }
  return ISO_WEEKDAY_BY_NAME[normalise(dayName)] ?? null;
}

/**
 * The date that weekday falls on within the ISO week of `reference`.
 *
 * Time is normalised to midnight UTC: `Meeting.meetingDate` has date-only
 * semantics (the hour lives in the schedule), and leaving a time component
 * would make two meetings of the same day compare unequal.
 */
export function dateForWeekdayInWeek(weekStart: Date, isoWeekday: number): Date {
  const date = new Date(weekStart.getTime());
  date.setUTCDate(date.getUTCDate() + (isoWeekday - 1));
  date.setUTCHours(0, 0, 0, 0);
  return date;
}
