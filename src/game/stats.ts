import { addDays } from './date';
import type { Mountain, Outcome } from './types';

export const OUTCOMES: readonly Outcome[] = [
  'basecamp',
  'camp',
  'treeline',
  'summit',
  'edelweiss',
  'fog',
];

export interface Stats {
  version: 1;
  played: number;
  streak: number;
  bestStreak: number;
  lastCompletedDate: string | null; // YYYY-MM-DD WIB
  totalAltitude: number;
  bestAltitude: number;
  bestMountainId: string | null;
  tierCounts: Record<Outcome, number>;
  mountains: string[]; // collected mountain ids (Basecamp excluded)
  edelweissCount: number;
}

export function emptyStats(): Stats {
  return {
    version: 1,
    played: 0,
    streak: 0,
    bestStreak: 0,
    lastCompletedDate: null,
    totalAltitude: 0,
    bestAltitude: 0,
    bestMountainId: null,
    tierCounts: { basecamp: 0, camp: 0, treeline: 0, summit: 0, edelweiss: 0, fog: 0 },
    mountains: [],
    edelweissCount: 0,
  };
}

/** Accept stored stats if they look sane, filling any missing fields with defaults. */
export function sanitizeStats(value: unknown): Stats {
  const base = emptyStats();
  if (!value || typeof value !== 'object') return base;
  const v = value as Partial<Stats>;
  const num = (x: unknown, d: number) => (typeof x === 'number' && Number.isFinite(x) ? x : d);
  const counts = { ...base.tierCounts };
  for (const o of OUTCOMES) counts[o] = num(v.tierCounts?.[o], 0);
  return {
    version: 1,
    played: num(v.played, 0),
    streak: num(v.streak, 0),
    bestStreak: num(v.bestStreak, 0),
    lastCompletedDate: typeof v.lastCompletedDate === 'string' ? v.lastCompletedDate : null,
    totalAltitude: num(v.totalAltitude, 0),
    bestAltitude: num(v.bestAltitude, 0),
    bestMountainId: typeof v.bestMountainId === 'string' ? v.bestMountainId : null,
    tierCounts: counts,
    mountains: Array.isArray(v.mountains)
      ? v.mountains.filter((m): m is string => typeof m === 'string')
      : [],
    edelweissCount: num(v.edelweissCount, 0),
  };
}

export interface CompletedDaily {
  date: string; // session date (WIB)
  altitude: number;
  outcomes: readonly Outcome[];
  mountain: Pick<Mountain, 'id' | 'altitude'>;
}

/**
 * Record one completed Muncak Harian.
 * Streak: last completed = yesterday → +1; same day → unchanged; otherwise reset to 1.
 */
export function recordDaily(stats: Stats, done: CompletedDaily): Stats {
  if (stats.lastCompletedDate === done.date) return stats;
  const isNewer = stats.lastCompletedDate === null || done.date > stats.lastCompletedDate;

  const tierCounts = { ...stats.tierCounts };
  for (const o of done.outcomes) tierCounts[o] += 1;
  const edelweiss = done.outcomes.filter((o) => o === 'edelweiss').length;

  let streak = stats.streak;
  let lastCompletedDate = stats.lastCompletedDate;
  if (isNewer) {
    const continues =
      stats.lastCompletedDate !== null && stats.lastCompletedDate === addDays(done.date, -1);
    streak = continues ? stats.streak + 1 : 1;
    lastCompletedDate = done.date;
  }

  const isBest = stats.played === 0 || done.altitude > stats.bestAltitude;
  const collect = done.mountain.altitude > 0 && !stats.mountains.includes(done.mountain.id);

  return {
    ...stats,
    played: stats.played + 1,
    streak,
    bestStreak: Math.max(stats.bestStreak, streak),
    lastCompletedDate,
    totalAltitude: stats.totalAltitude + done.altitude,
    bestAltitude: isBest ? done.altitude : stats.bestAltitude,
    bestMountainId: isBest ? done.mountain.id : stats.bestMountainId,
    tierCounts,
    mountains: collect ? [...stats.mountains, done.mountain.id] : stats.mountains,
    edelweissCount: stats.edelweissCount + edelweiss,
  };
}

/** Streak as shown today: it lapses once a whole WIB day is missed. */
export function currentStreak(stats: Stats, today: string): number {
  const last = stats.lastCompletedDate;
  return last === today || last === addDays(today, -1) ? stats.streak : 0;
}

export function averageAltitude(stats: Stats): number {
  return stats.played === 0 ? 0 : Math.round(stats.totalAltitude / stats.played);
}
