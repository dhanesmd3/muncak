import { afterEach, describe, expect, it } from 'vitest';
import {
  addDays,
  dayNumber,
  daysBetween,
  formatCountdown,
  isValidDate,
  msUntilNextReset,
  timeOfDayWIB,
  todayWIB,
} from '../../src/game/date';

const at = (iso: string) => new Date(iso);

describe('todayWIB', () => {
  it('23:59:59 WIB is still the same day, 00:00:00 WIB is the next', () => {
    expect(todayWIB(at('2026-11-30T16:59:59.999Z'))).toBe('2026-11-30'); // 23:59:59.999 WIB
    expect(todayWIB(at('2026-11-30T17:00:00.000Z'))).toBe('2026-12-01'); // 00:00:00 WIB
  });

  it('handles the year change', () => {
    expect(todayWIB(at('2026-12-31T16:59:59Z'))).toBe('2026-12-31');
    expect(todayWIB(at('2026-12-31T17:00:00Z'))).toBe('2027-01-01');
  });

  describe('on a device outside WIB', () => {
    const original = process.env.TZ;
    afterEach(() => {
      // process.env stores strings, so assigning undefined would set TZ to "undefined".
      if (original === undefined) delete process.env.TZ;
      else process.env.TZ = original;
    });

    it('ignores the device time zone (America/New_York)', () => {
      process.env.TZ = 'America/New_York';
      // Local New York noon on 31 Dec = 17:00 UTC = 00:00 WIB on 1 Jan.
      const nyNoon = new Date(2026, 11, 31, 12, 0, 0);
      expect(nyNoon.toISOString()).toBe('2026-12-31T17:00:00.000Z'); // TZ really applied
      expect(todayWIB(nyNoon)).toBe('2027-01-01');
      expect(todayWIB(new Date(2026, 11, 31, 11, 59, 59))).toBe('2026-12-31');
    });

    it('ignores the device time zone (Asia/Jayapura, WIT)', () => {
      process.env.TZ = 'Asia/Jayapura';
      // 01:30 WIT is still 23:30 WIB the previous day.
      expect(new Date(2026, 11, 1, 1, 30).toISOString()).toBe('2026-11-30T16:30:00.000Z');
      expect(todayWIB(new Date(2026, 11, 1, 1, 30))).toBe('2026-11-30');
      expect(todayWIB(new Date(2026, 11, 1, 2, 0))).toBe('2026-12-01');
    });
  });
});

describe('dayNumber', () => {
  it('counts launch day as #1', () => {
    expect(dayNumber('2026-12-01', '2026-12-01')).toBe(1);
    expect(dayNumber('2026-12-02', '2026-12-01')).toBe(2);
    expect(dayNumber('2027-01-11', '2026-12-01')).toBe(42);
  });
});

describe('msUntilNextReset', () => {
  it('measures to the next 00:00 WIB', () => {
    expect(msUntilNextReset(at('2026-11-30T16:59:59Z'))).toBe(1000);
    expect(msUntilNextReset(at('2026-11-30T17:00:00Z'))).toBe(24 * 3600 * 1000);
    expect(msUntilNextReset(at('2026-11-30T10:47:20Z'))).toBe((6 * 3600 + 12 * 60 + 40) * 1000);
  });
});

describe('calendar helpers', () => {
  it('adds days across month, year and leap day', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2027-01-01', -1)).toBe('2026-12-31');
    expect(daysBetween('2026-12-01', '2026-12-31')).toBe(30);
  });

  it('validates dates', () => {
    expect(isValidDate('2026-12-01')).toBe(true);
    expect(isValidDate('2026-02-30')).toBe(false);
    expect(isValidDate('2026-2-3')).toBe(false);
    expect(isValidDate('nope')).toBe(false);
  });

  it('formats the countdown', () => {
    expect(formatCountdown((6 * 3600 + 12 * 60 + 40) * 1000)).toBe('06:12:40');
    expect(formatCountdown(999)).toBe('00:00:00');
    expect(formatCountdown(-5)).toBe('00:00:00');
  });
});

describe('timeOfDayWIB (scene palette, docs/04-art-ui.md §5.2)', () => {
  // UTC = WIB − 7 h.
  it.each([
    ['2026-12-01T21:59:59Z', 'night'], // 04:59:59 WIB
    ['2026-12-01T22:00:00Z', 'morning'], // 05:00 WIB
    ['2026-12-02T02:59:59Z', 'morning'], // 09:59:59 WIB
    ['2026-12-02T03:00:00Z', 'day'], // 10:00 WIB
    ['2026-12-02T07:59:59Z', 'day'], // 14:59:59 WIB
    ['2026-12-02T08:00:00Z', 'evening'], // 15:00 WIB
    ['2026-12-02T10:59:59Z', 'evening'], // 17:59:59 WIB
    ['2026-12-02T11:00:00Z', 'night'], // 18:00 WIB
    ['2026-12-31T16:59:59Z', 'night'], // 23:59:59 WIB, year end
    ['2026-12-31T17:00:00Z', 'night'], // 00:00 WIB, new year
  ])('%s → %s', (iso, expected) => {
    expect(timeOfDayWIB(new Date(iso))).toBe(expected);
  });

  it('ignores the device time zone', () => {
    const original = process.env.TZ;
    try {
      process.env.TZ = 'America/New_York';
      // 21:00 in New York (UTC−5) = 02:00 UTC = 09:00 WIB → morning, not night.
      const nyEvening = new Date(2026, 11, 1, 21, 0, 0);
      expect(nyEvening.toISOString()).toBe('2026-12-02T02:00:00.000Z');
      expect(timeOfDayWIB(nyEvening)).toBe('morning');
    } finally {
      if (original === undefined) delete process.env.TZ;
      else process.env.TZ = original;
    }
  });
});
