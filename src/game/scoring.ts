import { METERS_PER_POINT, POINTS, TITLES } from './constants';
import type { Mountain, Outcome, RoundState } from './types';

export const altitude = (points: number) => points * METERS_PER_POINT;

export function pointsFor(outcome: Outcome): number {
  return outcome === 'fog' ? 0 : POINTS[outcome];
}

/** Total points of all finished rounds. */
export function totalPoints(rounds: readonly RoundState[]): number {
  return rounds.reduce((sum, r) => sum + (r.result?.points ?? 0), 0);
}

/** Highest mountain with altitude ≤ score. `mountains` is sorted ascending, Basecamp (0) first. */
export function reachedMountain(alt: number, mountains: readonly Mountain[]): Mountain {
  let best = mountains[0]!; // Basecamp, altitude 0
  for (const m of mountains) if (m.altitude <= alt) best = m;
  return best;
}

/** Mountains passed when climbing from `from` (exclusive) to `to` (inclusive). */
export function checkpointsPassed(
  from: number,
  to: number,
  mountains: readonly Mountain[],
): Mountain[] {
  return mountains.filter((m) => m.altitude > from && m.altitude <= to);
}

export function titleFor(alt: number): string {
  let title: string = TITLES[0].title;
  for (const t of TITLES) if (alt >= t.min) title = t.title;
  return title;
}

/** Outcomes of finished rounds in order (for the icon row and the share text). */
export function outcomes(rounds: readonly RoundState[]): Outcome[] {
  return rounds.flatMap((r) => (r.result ? [r.result.outcome] : []));
}
