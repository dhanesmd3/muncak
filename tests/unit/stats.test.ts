import { describe, expect, it } from 'vitest';
import {
  averageAltitude,
  currentStreak,
  emptyStats,
  recordDaily,
  sanitizeStats,
  type CompletedDaily,
} from '../../src/game/stats';

const day = (date: string, altitude = 1000, id = 'nglanggeran'): CompletedDaily => ({
  date,
  altitude,
  outcomes: ['basecamp', 'edelweiss', 'fog'],
  mountain: { id, altitude: id === 'basecamp' ? 0 : 700 },
});

describe('streak (docs/05-teknis.md §8)', () => {
  it('starts at 1', () => {
    expect(recordDaily(emptyStats(), day('2026-12-01')).streak).toBe(1);
  });

  it('+1 when the last completed day was yesterday (WIB)', () => {
    let s = recordDaily(emptyStats(), day('2026-12-31'));
    s = recordDaily(s, day('2027-01-01'));
    expect(s.streak).toBe(2);
    expect(s.bestStreak).toBe(2);
  });

  it('unchanged when it is the same day', () => {
    const once = recordDaily(emptyStats(), day('2026-12-01'));
    expect(recordDaily(once, day('2026-12-01'))).toBe(once);
  });

  it('resets to 1 after a missed day, keeping the best streak', () => {
    let s = recordDaily(emptyStats(), day('2026-12-01'));
    s = recordDaily(s, day('2026-12-02'));
    s = recordDaily(s, day('2026-12-04'));
    expect(s.streak).toBe(1);
    expect(s.bestStreak).toBe(2);
  });

  it('lapses on screen once a whole day is missed', () => {
    const s = recordDaily(emptyStats(), day('2026-12-01'));
    expect(currentStreak(s, '2026-12-01')).toBe(1);
    expect(currentStreak(s, '2026-12-02')).toBe(1);
    expect(currentStreak(s, '2026-12-03')).toBe(0);
  });
});

describe('recordDaily', () => {
  it('counts tiers, edelweiss and altitudes', () => {
    let s = recordDaily(emptyStats(), day('2026-12-01', 1000));
    s = recordDaily(s, day('2026-12-02', 3000, 'merbabu'));
    expect(s.played).toBe(2);
    expect(s.tierCounts).toEqual({
      basecamp: 2,
      camp: 0,
      treeline: 0,
      summit: 0,
      edelweiss: 2,
      fog: 2,
    });
    expect(s.edelweissCount).toBe(2);
    expect(s.bestAltitude).toBe(3000);
    expect(s.bestMountainId).toBe('merbabu');
    expect(averageAltitude(s)).toBe(2000);
  });

  it('collects each mountain once and never Basecamp', () => {
    let s = recordDaily(emptyStats(), day('2026-12-01', 0, 'basecamp'));
    expect(s.mountains).toEqual([]);
    expect(s.bestMountainId).toBe('basecamp');
    s = recordDaily(s, day('2026-12-02', 800));
    s = recordDaily(s, day('2026-12-03', 900));
    expect(s.mountains).toEqual(['nglanggeran']);
  });
});

describe('sanitizeStats', () => {
  it('fills missing or broken fields with defaults', () => {
    const s = sanitizeStats({
      played: 3,
      streak: 'x',
      tierCounts: { camp: 2 },
      mountains: [1, 'a'],
    });
    expect(s.played).toBe(3);
    expect(s.streak).toBe(0);
    expect(s.tierCounts.camp).toBe(2);
    expect(s.tierCounts.fog).toBe(0);
    expect(s.mountains).toEqual(['a']);
    expect(sanitizeStats(null)).toEqual(emptyStats());
  });
});
