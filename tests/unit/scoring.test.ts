import { describe, expect, it } from 'vitest';
import mountainsJson from '../../content/mountains.json';
import { POINTS, ROUNDS_PER_DAY } from '../../src/game/constants';
import {
  altitude,
  checkpointsPassed,
  outcomes,
  pointsFor,
  reachedMountain,
  titleFor,
  totalPoints,
} from '../../src/game/scoring';
import type { Mountain, RoundState } from '../../src/game/types';

const mountains = mountainsJson as Mountain[];

describe('points and altitude', () => {
  it('uses the tier points from the design doc', () => {
    expect(POINTS).toEqual({ basecamp: 10, camp: 30, treeline: 60, summit: 85, edelweiss: 100 });
    expect(pointsFor('fog')).toBe(0);
    expect(pointsFor('summit')).toBe(85);
  });

  it('converts points to mdpl (× 7)', () => {
    expect(altitude(0)).toBe(0);
    expect(altitude(525)).toBe(3675);
  });

  it('caps a perfect day at 4.900 mdpl', () => {
    expect(altitude(ROUNDS_PER_DAY * POINTS.edelweiss)).toBe(4900);
  });

  it('sums finished rounds only', () => {
    const r = (points: number | null): RoundState => ({
      promptId: 'x',
      startedAt: 0,
      attempts: [],
      result: points === null ? null : { outcome: 'basecamp', answerId: 'a', points, fuzzy: false },
      finishedAt: 0,
    });
    expect(totalPoints([r(10), r(85), r(null)])).toBe(95);
    expect(outcomes([r(10), r(null)])).toEqual(['basecamp']);
  });
});

describe('checkpoints (docs/02-game-design.md §2.4)', () => {
  // Minimum points per checkpoint from the design table.
  const table: [number, string][] = [
    [0, 'basecamp'],
    [100, 'nglanggeran'],
    [246, 'batur'],
    [298, 'tangkuban-parahu'],
    [333, 'bromo'],
    [367, 'prau'],
    [423, 'gede'],
    [450, 'merbabu'],
    [490, 'slamet'],
    [526, 'semeru'],
    [533, 'rinjani'],
    [544, 'kerinci'],
    [698, 'puncak-jaya'],
  ];

  it.each(table)('%i points reaches %s, one point less does not', (points, id) => {
    expect(reachedMountain(altitude(points), mountains).id).toBe(id);
    if (points > 0) expect(reachedMountain(altitude(points - 1), mountains).id).not.toBe(id);
  });

  it('Cartenz needs a perfect score in practice', () => {
    // 7 rounds can only total multiples of 5; the best non-perfect day is 6 × 100 + 85.
    expect(reachedMountain(altitude(685), mountains).id).toBe('kerinci');
    expect(reachedMountain(altitude(700), mountains).id).toBe('puncak-jaya');
  });

  it('lists the checkpoints passed on a climb', () => {
    expect(checkpointsPassed(1715, 2331, mountains).map((m) => m.id)).toEqual([
      'batur',
      'tangkuban-parahu',
      'bromo',
    ]);
    expect(checkpointsPassed(700, 700, mountains)).toEqual([]);
    expect(checkpointsPassed(0, 700, mountains).map((m) => m.id)).toEqual(['nglanggeran']);
  });
});

describe('titles (docs/02-game-design.md §2.5)', () => {
  it.each([
    [0, 'Pendaki Pemula'],
    [999, 'Pendaki Pemula'],
    [1000, 'Pendaki Akhir Pekan'],
    [1999, 'Pendaki Akhir Pekan'],
    [2000, 'Anak Gunung'],
    [3000, 'Pemburu Puncak'],
    [3999, 'Pemburu Puncak'],
    [4000, 'Legenda Jalur'],
    [4899, 'Legenda Jalur'],
    [4900, 'Penakluk Cartenz'],
  ])('%i mdpl → %s', (alt, title) => {
    expect(titleFor(alt)).toBe(title);
  });
});
