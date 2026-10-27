// Ekspedisi: endless mode with one shared "logistik" timer (docs/02-game-design.md §5.1).
import {
  EXPEDITION_BONUS,
  EXPEDITION_SKIP_PENALTY,
  EXPEDITION_START_SECONDS,
  MAX_INPUT_LENGTH,
  WRONG_PENALTY_SECONDS,
} from './constants';
import { buildIndex, matchAnswer, type MatchIndex } from './match';
import { normalize } from './normalize';
import { altitude, pointsFor } from './scoring';
import type { Prompt, Tier } from './types';

export interface ExpeditionResult {
  promptId: string;
  outcome: Tier | 'skip';
  answerId: string | null;
  points: number;
  attempts: string[]; // raw inputs, for logging
}

export type ExpeditionFeedback =
  | { kind: 'accepted'; tier: Tier; answerText: string; bonusSeconds: number }
  | { kind: 'rejected'; input: string; reason: string }
  | { kind: 'unknown'; input: string }
  | { kind: 'too_short'; input: string }
  | { kind: 'duplicate'; input: string }
  | { kind: 'skipped'; promptText: string };

export interface ExpeditionState {
  phase: 'playing' | 'finished';
  startedAt: number;
  bonusMs: number;
  penaltyMs: number;
  order: string[]; // prompt ids in play order
  index: number; // position in `order`
  keys: string[]; // normalized inputs tried on the current prompt
  inputs: string[]; // raw inputs on the current prompt
  results: ExpeditionResult[];
  points: number;
  feedback: ExpeditionFeedback | null;
  finishedAt: number | null;
}

export type ExpeditionAction =
  | { type: 'submit'; input: string; now: number }
  | { type: 'skip'; now: number }
  | { type: 'tick'; now: number };

/** Fisher–Yates with an injectable random source (Math.random in the app, seeded in tests). */
export function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

export function createExpedition(
  bank: readonly Prompt[],
  exclude: readonly string[],
  now: number,
  random: () => number,
): ExpeditionState {
  const order = shuffle(
    bank.filter((p) => !exclude.includes(p.id)).map((p) => p.id),
    random,
  );
  return {
    phase: order.length > 0 ? 'playing' : 'finished',
    startedAt: now,
    bonusMs: 0,
    penaltyMs: 0,
    order,
    index: 0,
    keys: [],
    inputs: [],
    results: [],
    points: 0,
    feedback: null,
    finishedAt: order.length > 0 ? null : now,
  };
}

/** Logistics left, always derived from startedAt plus bonuses minus penalties. */
export function logisticsMs(s: ExpeditionState, now: number): number {
  const total = EXPEDITION_START_SECONDS * 1000 + s.bonusMs - s.penaltyMs;
  return total - Math.max(0, (s.finishedAt ?? now) - s.startedAt);
}

export function expeditionAltitude(s: ExpeditionState): number {
  return altitude(s.points);
}

function finish(s: ExpeditionState, now: number): ExpeditionState {
  return { ...s, phase: 'finished', finishedAt: now };
}

/** Move to the next prompt; the run also ends when the bank runs out. */
function advance(s: ExpeditionState, result: ExpeditionResult, now: number): ExpeditionState {
  const next: ExpeditionState = {
    ...s,
    index: s.index + 1,
    keys: [],
    inputs: [],
    results: [...s.results, result],
    points: s.points + result.points,
  };
  return next.index >= next.order.length ? finish(next, now) : next;
}

export function createExpeditionReducer(bank: readonly Prompt[]) {
  const prompts = new Map(bank.map((p) => [p.id, p]));
  const indexes = new Map<string, MatchIndex>();
  const indexFor = (id: string) => {
    let idx = indexes.get(id);
    if (!idx) {
      idx = buildIndex(prompts.get(id)!);
      indexes.set(id, idx);
    }
    return idx;
  };

  return function expeditionReducer(s: ExpeditionState, a: ExpeditionAction): ExpeditionState {
    if (s.phase !== 'playing') return s;
    if (logisticsMs(s, a.now) <= 0) return finish(s, a.now);
    if (a.type === 'tick') return s;

    const id = s.order[s.index]!;
    const prompt = prompts.get(id)!;

    if (a.type === 'skip') {
      const skipped = {
        ...s,
        penaltyMs: s.penaltyMs + EXPEDITION_SKIP_PENALTY * 1000,
        feedback: { kind: 'skipped' as const, promptText: prompt.prompt },
      };
      const result = { promptId: id, outcome: 'skip' as const, answerId: null, points: 0 };
      const next = advance(skipped, { ...result, attempts: s.inputs }, a.now);
      return logisticsMs(next, a.now) <= 0 ? finish(next, a.now) : next;
    }

    const index = indexFor(id);
    const input = a.input.trim().slice(0, MAX_INPUT_LENGTH);
    const key = normalize(input, index.prefixes);
    const r = matchAnswer(index, input, s.keys);
    if (r.kind === 'too_short' || r.kind === 'duplicate') {
      return { ...s, feedback: { kind: r.kind, input } };
    }
    const tried = { ...s, keys: [...s.keys, key], inputs: [...s.inputs, input] };
    if (r.kind === 'accepted') {
      const answer = prompt.answers.find((x) => x.id === r.answerId)!;
      const bonus = EXPEDITION_BONUS[r.tier];
      return advance(
        {
          ...tried,
          bonusMs: s.bonusMs + bonus * 1000,
          feedback: {
            kind: 'accepted',
            tier: r.tier,
            answerText: answer.text,
            bonusSeconds: bonus,
          },
        },
        {
          promptId: id,
          outcome: r.tier,
          answerId: r.answerId,
          points: pointsFor(r.tier),
          attempts: tried.inputs,
        },
        a.now,
      );
    }
    const wrong: ExpeditionState = {
      ...tried,
      penaltyMs: s.penaltyMs + WRONG_PENALTY_SECONDS * 1000,
      feedback:
        r.kind === 'rejected'
          ? { kind: 'rejected', input, reason: r.reason }
          : { kind: 'unknown', input },
    };
    return logisticsMs(wrong, a.now) <= 0 ? finish(wrong, a.now) : wrong;
  };
}

/** Multiple of Cartenz (rounded down to 0.1) once the score passes it, e.g. 1.3; else null. */
export function cartenzRatio(alt: number, cartenz: number): number | null {
  if (alt <= cartenz) return null;
  return Math.floor((alt / cartenz) * 10) / 10;
}
