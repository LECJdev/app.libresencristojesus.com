/**
 * ISO-8601 week arithmetic.
 *
 * Pure functions with no dependencies, so the rules that decide whether a
 * Líder may still edit an attendance sheet can be tested exhaustively —
 * including the year boundaries where this is genuinely easy to get wrong.
 *
 * WHY NOT A DATE LIBRARY
 * The project has no date library, and adding one to compute two integers
 * would be a dependency (and a bundle) bought for very little. The
 * algorithm below is the standard one and is covered by tests at the exact
 * dates where naive implementations fail.
 */

export interface IsoWeek {
  /**
   * ISO year — NOT the calendar year. 2026-12-31 belongs to ISO year 2027,
   * and pairing a calendar year with an ISO week number is the classic
   * off-by-one that makes a January meeting collide with a December one.
   */
  isoYear: number;
  /** 1..53. */
  isoWeek: number;
}

/** Midnight UTC of the given instant, so week maths never depends on time of day. */
function atUtcMidnight(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/**
 * ISO weekday: Monday = 1 … Sunday = 7.
 *
 * `getUTCDay()` returns Sunday = 0, which is exactly the mismatch that
 * makes "start of week" calculations silently slide by a day.
 */
export function isoWeekday(date: Date): number {
  const day = date.getUTCDay();
  return day === 0 ? 7 : day;
}

/**
 * The ISO year and week a date belongs to.
 *
 * Standard algorithm: shift to the Thursday of the same week — the ISO year
 * is *defined* as the year containing that Thursday — then count weeks from
 * the first Thursday of that year.
 */
export function getIsoWeek(date: Date): IsoWeek {
  const target = atUtcMidnight(date);
  // Move to Thursday of this week.
  target.setUTCDate(target.getUTCDate() + 4 - isoWeekday(target));

  const isoYear = target.getUTCFullYear();
  const firstThursday = new Date(Date.UTC(isoYear, 0, 4));
  firstThursday.setUTCDate(firstThursday.getUTCDate() + 4 - isoWeekday(firstThursday));

  const millisecondsPerWeek = 7 * 24 * 60 * 60 * 1000;
  const isoWeek =
    1 + Math.round((target.getTime() - firstThursday.getTime()) / millisecondsPerWeek);

  return { isoYear, isoWeek };
}

/** Monday 00:00:00.000 UTC of the week the date belongs to. */
export function startOfIsoWeek(date: Date): Date {
  const start = atUtcMidnight(date);
  start.setUTCDate(start.getUTCDate() - (isoWeekday(start) - 1));
  return start;
}

/** Sunday 23:59:59.999 UTC of the week the date belongs to. */
export function endOfIsoWeek(date: Date): Date {
  const end = startOfIsoWeek(date);
  end.setUTCDate(end.getUTCDate() + 6);
  end.setUTCHours(23, 59, 59, 999);
  return end;
}

/** True when both instants fall in the same ISO week of the same ISO year. */
export function isSameIsoWeek(a: Date, b: Date): boolean {
  const first = getIsoWeek(a);
  const second = getIsoWeek(b);
  return first.isoYear === second.isoYear && first.isoWeek === second.isoWeek;
}
