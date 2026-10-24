import { MAX_INPUT_LENGTH, ROUND_SECONDS, WRONG_PENALTY_SECONDS } from './constants';
import { buildIndex, matchAnswer } from './match';
import { normalize } from './normalize';
import { pointsFor } from './scoring';
import type { Attempt, DailyPayload, DailyState, RoundState } from './types';

export type DailyAction =
  | { type: 'start'; now: number }
  | { type: 'submit'; input: string; now: number }
  | { type: 'tick'; now: number }
  | { type: 'next'; now: number }
  | { type: 'clearFeedback' };

function emptyRound(promptId: string): RoundState {
  return { promptId, startedAt: null, attempts: [], result: null, finishedAt: null };
}

export function createDailyState(payload: DailyPayload): DailyState {
  return {
    version: 1,
    date: payload.date,
    dayNumber: payload.dayNumber,
    phase: 'idle',
    current: 0,
    rounds: payload.prompts.map((p) => emptyRound(p.id)),
    feedback: null,
  };
}

/** Number of attempts that cost time (rejected or unknown). */
export function penaltyCount(round: RoundState): number {
  return round.attempts.filter((a) => a.kind !== 'accepted').length;
}

/** Remaining time, always derived from `startedAt` (never a decremented counter). */
export function remainingMs(round: RoundState, now: number): number {
  const limit = ROUND_SECONDS * 1000 - penaltyCount(round) * WRONG_PENALTY_SECONDS * 1000;
  if (round.startedAt === null) return limit;
  return limit - Math.max(0, now - round.startedAt);
}

function replaceRound(state: DailyState, round: RoundState): RoundState[] {
  return state.rounds.map((r, i) => (i === state.current ? round : r));
}

function finishWithFog(state: DailyState, round: RoundState, now: number): DailyState {
  const done: RoundState = {
    ...round,
    result: { outcome: 'fog', answerId: null, points: 0, fuzzy: false },
    finishedAt: now,
  };
  return { ...state, phase: 'reveal', rounds: replaceRound(state, done), feedback: null };
}

/** Turn the current round into fog once its time is up. Returns the same state otherwise. */
function tick(state: DailyState, now: number): DailyState {
  if (state.phase !== 'playing') return state;
  const round = state.rounds[state.current]!;
  return remainingMs(round, now) <= 0 ? finishWithFog(state, round, now) : state;
}

/** Reducer for one Muncak Harian session. Match indexes are built once per payload. */
export function createDailyReducer(payload: DailyPayload) {
  const indexes = payload.prompts.map(buildIndex);

  return function dailyReducer(state: DailyState, action: DailyAction): DailyState {
    switch (action.type) {
      case 'start': {
        if (state.phase !== 'idle') return state;
        const first = { ...state.rounds[0]!, startedAt: action.now };
        return {
          ...state,
          phase: 'playing',
          current: 0,
          rounds: [first, ...state.rounds.slice(1)],
        };
      }

      case 'tick':
        return tick(state, action.now);

      case 'submit': {
        if (state.phase !== 'playing') return state;
        const round = state.rounds[state.current]!;
        if (remainingMs(round, action.now) <= 0) return finishWithFog(state, round, action.now);

        const index = indexes[state.current]!;
        const input = action.input.trim().slice(0, MAX_INPUT_LENGTH);
        const key = normalize(input, index.prefixes);
        const result = matchAnswer(
          index,
          input,
          round.attempts.map((a) => a.key),
        );

        if (result.kind === 'too_short' || result.kind === 'duplicate') {
          return { ...state, feedback: { kind: result.kind, input } };
        }

        const attempt: Attempt = { input, key, kind: result.kind, at: action.now };
        const next: RoundState = { ...round, attempts: [...round.attempts, attempt] };

        if (result.kind === 'accepted') {
          const done: RoundState = {
            ...next,
            result: {
              outcome: result.tier,
              answerId: result.answerId,
              points: pointsFor(result.tier),
              fuzzy: result.fuzzy,
            },
            finishedAt: action.now,
          };
          return { ...state, phase: 'reveal', rounds: replaceRound(state, done), feedback: null };
        }

        const feedback =
          result.kind === 'rejected'
            ? { kind: 'rejected' as const, input, reason: result.reason }
            : { kind: 'unknown' as const, input };
        if (remainingMs(next, action.now) <= 0) {
          return finishWithFog({ ...state, rounds: replaceRound(state, next) }, next, action.now);
        }
        return { ...state, rounds: replaceRound(state, next), feedback };
      }

      case 'next': {
        if (state.phase !== 'reveal') return state;
        if (state.current >= state.rounds.length - 1) {
          return { ...state, phase: 'finished', feedback: null };
        }
        const current = state.current + 1;
        const rounds = state.rounds.map((r, i) =>
          i === current ? { ...r, startedAt: action.now } : r,
        );
        return { ...state, phase: 'playing', current, rounds, feedback: null };
      }

      case 'clearFeedback':
        return state.feedback ? { ...state, feedback: null } : state;
    }
  };
}

function isRoundState(value: unknown): value is RoundState {
  if (!value || typeof value !== 'object') return false;
  const r = value as RoundState;
  return (
    typeof r.promptId === 'string' &&
    (r.startedAt === null || typeof r.startedAt === 'number') &&
    Array.isArray(r.attempts) &&
    (r.finishedAt === null || typeof r.finishedAt === 'number')
  );
}

/**
 * Restore a saved session for this payload, or start a fresh one.
 * The timer keeps running while the tab is closed: an expired round becomes fog.
 */
export function restoreDailyState(saved: unknown, payload: DailyPayload, now: number): DailyState {
  const fresh = createDailyState(payload);
  if (!saved || typeof saved !== 'object') return fresh;
  const s = saved as Partial<DailyState>;
  const phases = ['idle', 'playing', 'reveal', 'finished'];
  if (
    s.version !== 1 ||
    s.date !== payload.date ||
    typeof s.phase !== 'string' ||
    !phases.includes(s.phase) ||
    typeof s.current !== 'number' ||
    !Array.isArray(s.rounds) ||
    s.rounds.length !== payload.prompts.length ||
    !s.rounds.every(isRoundState) ||
    s.current < 0 ||
    s.current >= payload.prompts.length
  ) {
    return fresh;
  }
  const cur = s.rounds[s.current]!;
  const consistent =
    s.phase === 'idle' ||
    (s.phase === 'playing' && cur.startedAt !== null && !cur.result) ||
    ((s.phase === 'reveal' || s.phase === 'finished') && !!cur.result);
  if (!consistent) return fresh;

  // If a prompt was swapped by a same-day hotfix, finished rounds keep their record and
  // unfinished rounds move to the new prompt (keeping `startedAt`, so no extra time).
  const rounds = s.rounds.map((r, i) => {
    const id = payload.prompts[i]!.id;
    if (r.promptId === id || r.result) return r;
    return { ...emptyRound(id), startedAt: r.startedAt };
  });

  const state: DailyState = {
    version: 1,
    date: payload.date,
    dayNumber: payload.dayNumber,
    phase: s.phase,
    current: s.current,
    rounds,
    feedback: null,
  };
  return tick(state, now);
}
