import { describe, expect, it } from 'vitest';
import fixture from '../fixtures/daily-prompts.json';
import { checkPacks, inSeason, type Content, type Report } from '../../scripts/content';
import { EXPEDITION_START_SECONDS } from '../../src/game/constants';
import { mondayOf } from '../../src/game/date';
import {
  cartenzRatio,
  createExpedition,
  createExpeditionReducer,
  logisticsMs,
  shuffle,
  type ExpeditionAction,
  type ExpeditionState,
} from '../../src/game/expedition';
import { cleanName, makeGroupCode, parseGroupCode } from '../../src/game/groups';
import { playFromDaily, scoreDaily, scoreRound } from '../../src/game/play';
import { applyTiers, computeTiers, tierForShare } from '../../src/game/rarity';
import { createDailyReducer, createDailyState, type DailyAction } from '../../src/game/reducer';
import type { Prompt } from '../../src/game/types';
import { isBadName } from '../../worker/src/badwords';

const prompts = fixture as Prompt[];
const S = 1000;
const T0 = 5_000_000;

describe('rarity (docs/05-teknis.md §10.4)', () => {
  const answers = prompts[0]!.answers; // merah/kuning/hijau basecamp, biru/ungu camp, jingga treeline, nila edelweiss

  it('keeps manual tiers below 200 rounds', () => {
    const t = computeTiers(answers, { rounds: 199, counts: { nila: 199 } });
    expect(t).toEqual(Object.fromEntries(answers.map((a) => [a.id, a.tier])));
  });

  it('re-tiers from shares with the prior, never touching Edelweiss', () => {
    const t = computeTiers(answers, {
      rounds: 1000,
      counts: { merah: 400, kuning: 5, hijau: 50, biru: 120, ungu: 15, jingga: 300, nila: 900 },
    });
    // share = (count + 50·prior) / 1050
    expect(t.merah).toBe('basecamp'); // (400 + 7.5) / 1050 ≈ 0.39
    expect(t.kuning).toBe('treeline'); // (5 + 7.5) / 1050 ≈ 0.012
    expect(t.hijau).toBe('camp'); // (50 + 7.5) / 1050 ≈ 0.055
    expect(t.biru).toBe('basecamp'); // (120 + 3) / 1050 ≈ 0.117
    expect(t.ungu).toBe('treeline'); // (15 + 3) / 1050 ≈ 0.017
    expect(t.jingga).toBe('basecamp'); // ≈ 0.29
    expect(t.nila).toBe('edelweiss');
  });

  it('maps share thresholds', () => {
    expect(tierForShare(0.1)).toBe('basecamp');
    expect(tierForShare(0.0999)).toBe('camp');
    expect(tierForShare(0.03)).toBe('camp');
    expect(tierForShare(0.01)).toBe('treeline');
    expect(tierForShare(0.0099)).toBe('summit');
  });

  it('applyTiers cannot create or remove Edelweiss', () => {
    const p = applyTiers(prompts[0]!, { merah: 'edelweiss', nila: 'basecamp', biru: 'summit' });
    expect(p.answers.find((a) => a.id === 'merah')!.tier).toBe('basecamp');
    expect(p.answers.find((a) => a.id === 'nila')!.tier).toBe('edelweiss');
    expect(p.answers.find((a) => a.id === 'biru')!.tier).toBe('summit');
  });
});

describe('server re-scoring matches the client reducer', () => {
  const payload = { date: '2026-12-01', dayNumber: 1, prompts };
  const reducer = createDailyReducer(payload);

  it('gives the same outcomes for the same inputs', () => {
    const script: string[][] = [
      ['x', 'hitam', 'HITAM', 'Nilaa'],
      ['coklat', 'senin'],
      ['pluto', 'Neptunis'],
      ['a', 'b'],
      ['ayam', 'tapir'],
      ['durian', 'cempedak'],
      ['sasando'],
    ];
    let s = reducer(createDailyState(payload), { type: 'start', now: T0 });
    let t = T0;
    script.forEach((inputs) => {
      for (const input of inputs) s = reducer(s, { type: 'submit', input, now: t + S });
      // rounds without an accepted answer time out
      s = reducer(s, { type: 'tick', now: t + 30 * S } as DailyAction);
      s = reducer(s, { type: 'next', now: t + 31 * S });
      t += 31 * S;
    });
    expect(s.phase).toBe('finished');
    const { response } = scoreDaily(prompts, playFromDaily(s).rounds);
    expect(response.tiers).toEqual(s.rounds.map((r) => r.result!.outcome));
    expect(response.tiers).toEqual([
      'edelweiss',
      'basecamp',
      'summit',
      'fog',
      'summit',
      'edelweiss',
      'edelweiss',
    ]);
  });

  it('skips too-short and repeated inputs and stops at the first accepted answer', () => {
    const r = scoreRound(prompts[0]!, ['x', 'hitam', 'Hitam!', 'merah', 'nila']);
    expect(r.outcome).toBe('basecamp');
    expect(r.logs.map((l) => l.outcome)).toEqual(['rejected', 'accepted']);
  });

  it('refuses rounds for other prompts', () => {
    const rounds = prompts.map((p) => ({ promptId: p.id, attempts: [] }));
    expect(() => scoreDaily(prompts, [...rounds].reverse())).toThrow();
    expect(() => scoreDaily(prompts, rounds.slice(1))).toThrow();
  });
});

describe('Ekspedisi (docs/02-game-design.md §5.1)', () => {
  const bank = prompts;
  const reducer = createExpeditionReducer(bank);
  const ordered = () => createExpedition(bank, [], T0, () => 0.999999); // keeps order
  const run = (s: ExpeditionState, actions: ExpeditionAction[]) => actions.reduce(reducer, s);

  it('starts with 45 s of logistics', () => {
    const s = ordered();
    expect(logisticsMs(s, T0)).toBe(EXPEDITION_START_SECONDS * S);
    expect(s.order).toEqual(bank.map((p) => p.id));
  });

  it('adds the tier bonus on accepted answers and moves on', () => {
    const s = run(ordered(), [{ type: 'submit', input: 'nila', now: T0 + 5 * S }]);
    expect(s.index).toBe(1);
    expect(s.points).toBe(100);
    expect(logisticsMs(s, T0 + 5 * S)).toBe((45 + 16 - 5) * S);
    expect(s.feedback).toMatchObject({ kind: 'accepted', tier: 'edelweiss', bonusSeconds: 16 });
  });

  it('costs 2 s for a wrong answer and 3 s for a skip', () => {
    const s = run(ordered(), [
      { type: 'submit', input: 'hitam', now: T0 },
      { type: 'submit', input: 'coklat', now: T0 },
      { type: 'submit', input: 'coklat', now: T0 }, // repeated: free
      { type: 'skip', now: T0 },
    ]);
    expect(logisticsMs(s, T0)).toBe((45 - 2 - 2 - 3) * S);
    expect(s.results[0]).toMatchObject({ outcome: 'skip', attempts: ['hitam', 'coklat'] });
  });

  it('ends when logistics run out, freezing the clock', () => {
    const s = run(ordered(), [{ type: 'tick', now: T0 + 45 * S }]);
    expect(s.phase).toBe('finished');
    expect(logisticsMs(s, T0 + 999 * S)).toBe(0);
    expect(run(s, [{ type: 'submit', input: 'merah', now: T0 + 46 * S }])).toBe(s);
  });

  it('ends when the bank runs out and excludes given prompts', () => {
    const one = createExpedition(
      bank,
      bank.slice(1).map((p) => p.id),
      T0,
      Math.random,
    );
    expect(one.order).toEqual([bank[0]!.id]);
    expect(run(one, [{ type: 'submit', input: 'merah', now: T0 + S }]).phase).toBe('finished');
    expect(createExpedition([], [], T0, Math.random).phase).toBe('finished');
  });

  it('shuffles with the given random source', () => {
    expect(shuffle([1, 2, 3, 4], () => 0)).toEqual([2, 3, 4, 1]);
    expect(shuffle([1, 2, 3], () => 0.999)).toEqual([1, 2, 3]);
  });

  it('reports multiples of Cartenz past 4.884 mdpl', () => {
    expect(cartenzRatio(4884, 4884)).toBeNull();
    expect(cartenzRatio(6400, 4884)).toBe(1.3);
  });
});

describe('Rombongan helpers', () => {
  it('makes and parses codes', () => {
    expect(makeGroupCode(() => 0)).toBe('MCK-2222');
    expect(parseGroupCode('mck 7k3q')).toBe('MCK-7K3Q');
    expect(parseGroupCode('7K3Q')).toBe('MCK-7K3Q');
    expect(parseGroupCode('MCK-7K3O')).toBeNull(); // O is not in the alphabet
    expect(parseGroupCode('MCK-7K3')).toBeNull();
  });

  it('cleans names to ≤ 20 characters', () => {
    expect(cleanName('  Anak   IF  ')).toBe('Anak IF');
    expect(cleanName('')).toBeNull();
    expect(cleanName('x'.repeat(21))).toBeNull();
    expect(cleanName('🌼'.repeat(20))).toBe('🌼'.repeat(20));
    expect(cleanName(42)).toBeNull();
  });

  it('filters rude names without flagging innocent ones', () => {
    for (const bad of ['Bangsat', 'k0nt0l', 'anjiiing', 'Si Tolol', 'BANG SAT']) {
      expect(isBadName(bad), bad).toBe(true);
    }
    for (const ok of ['Rina', 'Anak IF 2024', 'Tasikmalaya', 'Kasur', 'Babinsa', 'Taiwan']) {
      expect(isBadName(ok), ok).toBe(false);
    }
  });

  it('weeks start on Monday', () => {
    expect(mondayOf('2026-11-30')).toBe('2026-11-30'); // Monday
    expect(mondayOf('2026-12-06')).toBe('2026-11-30'); // Sunday
    expect(mondayOf('2027-01-01')).toBe('2026-12-28');
  });
});

describe('Paket Tema content rules', () => {
  const bank = prompts.map((p) => ({ ...p, status: 'verified' as const, pool: 'bank' as const }));
  const run = (packPrompts: string[], pool: Prompt[] = bank) => {
    const content: Content = {
      prompts: new Map(pool.map((p) => [p.id, p])),
      mountains: [],
      schedule: new Map(),
      packs: [{ id: 'kuliner', title: 'Kuliner', description: 'x', prompts: packPrompts }],
      rarity: {},
    };
    const report: Report = { errors: [], warnings: [] };
    checkPacks(content, report);
    return report.errors.join('\n');
  };

  it('needs 7 verified bank prompts', () => {
    expect(run(bank.map((p) => p.id))).toBe('');
    expect(run(bank.slice(1).map((p) => p.id))).toMatch(/exactly 7/);
    const daily = bank.map((p, i) => (i === 0 ? { ...p, pool: undefined } : p));
    expect(
      run(
        bank.map((p) => p.id),
        daily,
      ),
    ).toMatch(/daily prompt/);
  });

  it('knows seasons, including ones that wrap the year end', () => {
    expect(inSeason({}, '2026-05-01')).toBe(true);
    const merdeka = { season: { from: '08-01', to: '08-31' } };
    expect(inSeason(merdeka, '2026-08-17')).toBe(true);
    expect(inSeason(merdeka, '2026-09-01')).toBe(false);
    const akhirTahun = { season: { from: '12-15', to: '01-05' } };
    expect(inSeason(akhirTahun, '2026-12-31')).toBe(true);
    expect(inSeason(akhirTahun, '2027-01-03')).toBe(true);
    expect(inSeason(akhirTahun, '2027-01-06')).toBe(false);
  });
});
