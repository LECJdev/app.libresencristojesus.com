import { endOfIsoWeek, getIsoWeek, isSameIsoWeek, isoWeekday, startOfIsoWeek } from './iso-week';

/**
 * ISO week arithmetic decides when a Líder loses the ability to edit an
 * attendance sheet, so it is tested at the dates where naive
 * implementations are known to break — the year boundaries.
 *
 * Reference values are the ISO-8601 definitions, not this implementation's
 * output: a test that asserts what the code happens to do proves nothing.
 */
describe('iso-week', () => {
  describe('isoWeekday', () => {
    it('maps Monday to 1 and Sunday to 7', () => {
      // 2026-07-27 is a Monday.
      expect(isoWeekday(new Date('2026-07-27T00:00:00Z'))).toBe(1);
      expect(isoWeekday(new Date('2026-08-02T00:00:00Z'))).toBe(7);
    });
  });

  describe('getIsoWeek', () => {
    it('resolves an ordinary mid-year date', () => {
      // Thursday 2026-07-30 falls in ISO week 31 of 2026.
      expect(getIsoWeek(new Date('2026-07-30T00:00:00Z'))).toEqual({ isoYear: 2026, isoWeek: 31 });
    });

    it('assigns late-December days to the NEXT ISO year when the week belongs there', () => {
      // 2019-12-30 (Monday) belongs to ISO week 1 of 2020 — pairing it with
      // calendar year 2019 would collide with the real week 1 of 2019.
      expect(getIsoWeek(new Date('2019-12-30T00:00:00Z'))).toEqual({ isoYear: 2020, isoWeek: 1 });
    });

    it('assigns early-January days to the PREVIOUS ISO year when the week belongs there', () => {
      // 2021-01-01 (Friday) belongs to ISO week 53 of 2020.
      expect(getIsoWeek(new Date('2021-01-01T00:00:00Z'))).toEqual({ isoYear: 2020, isoWeek: 53 });
    });

    it('recognises a 53-week ISO year', () => {
      // 2020 has 53 ISO weeks; 2020-12-31 is in the last one.
      expect(getIsoWeek(new Date('2020-12-31T00:00:00Z'))).toEqual({ isoYear: 2020, isoWeek: 53 });
    });

    it('starts the year on the week containing the first Thursday', () => {
      // 2026-01-01 is a Thursday, so it is week 1 of 2026.
      expect(getIsoWeek(new Date('2026-01-01T00:00:00Z'))).toEqual({ isoYear: 2026, isoWeek: 1 });
    });

    it('ignores the time of day', () => {
      const early = getIsoWeek(new Date('2026-07-30T00:00:00Z'));
      const late = getIsoWeek(new Date('2026-07-30T23:59:59Z'));
      expect(early).toEqual(late);
    });
  });

  describe('startOfIsoWeek / endOfIsoWeek', () => {
    it('returns Monday 00:00 and Sunday 23:59:59.999', () => {
      const thursday = new Date('2026-07-30T14:22:00Z');

      expect(startOfIsoWeek(thursday).toISOString()).toBe('2026-07-27T00:00:00.000Z');
      expect(endOfIsoWeek(thursday).toISOString()).toBe('2026-08-02T23:59:59.999Z');
    });

    it('treats Sunday as the LAST day of its week, not the first', () => {
      // The whole point of ISO: a Sunday belongs to the week that started
      // the previous Monday. Getting this wrong shifts every lock by a day.
      const sunday = new Date('2026-08-02T10:00:00Z');
      expect(startOfIsoWeek(sunday).toISOString()).toBe('2026-07-27T00:00:00.000Z');
    });

    it('handles a week that spans a year boundary', () => {
      const newYearsEve = new Date('2019-12-31T12:00:00Z');
      expect(startOfIsoWeek(newYearsEve).toISOString()).toBe('2019-12-30T00:00:00.000Z');
      expect(endOfIsoWeek(newYearsEve).toISOString()).toBe('2020-01-05T23:59:59.999Z');
    });
  });

  describe('isSameIsoWeek', () => {
    it('is true for Monday and the Sunday that closes the same week', () => {
      expect(
        isSameIsoWeek(new Date('2026-07-27T00:00:00Z'), new Date('2026-08-02T23:00:00Z')),
      ).toBe(true);
    });

    it('is false for Sunday and the Monday that opens the next week', () => {
      // This is the exact boundary RN-407 turns on: the meeting locks here.
      expect(
        isSameIsoWeek(new Date('2026-08-02T23:59:00Z'), new Date('2026-08-03T00:01:00Z')),
      ).toBe(false);
    });

    it('is false for the same week number in different ISO years', () => {
      expect(
        isSameIsoWeek(new Date('2025-07-30T00:00:00Z'), new Date('2026-07-30T00:00:00Z')),
      ).toBe(false);
    });
  });
});
