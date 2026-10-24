import { describe, expect, it } from 'vitest';
import fixture from '../fixtures/daily-prompts.json';
import { ROUND_SECONDS, WRONG_PENALTY_SECONDS } from '../../src/game/constants';
import {
  createDailyReducer,
  createDailyState,
  remainingMs,
  restoreDailyState,
  type DailyAction,
} from '../../src/game/reducer';
import type { DailyPayload, DailyState, Prompt } from '../../src/game/types';

const payload: DailyPayload = {
  date: '2026-12-01',
  dayNumber: 1,
  prompts: fixture as Prompt[],
};
const reducer = createDailyReducer(payload);
const T0 = 1_000_000;
const S = 1000;

function run(actions: DailyAction[], from: DailyState = createDailyState(payload)): DailyState {
  return actions.reduce(reducer, from);
}

describe('round flow', () => {
  it('starts in idle with 7 empty rounds', () => {
    const s = createDailyState(payload);
    expect(s.phase).toBe('idle');
    expect(s.rounds).toHaveLength(7);
    expect(s.rounds.map((r) => r.promptId)).toEqual(payload.prompts.map((p) => p.id));
  });

  it('start sets startedAt on the first round', () => {
    const s = run([{ type: 'start', now: T0 }]);
    expect(s.phase).toBe('playing');
    expect(s.rounds[0]!.startedAt).toBe(T0);
  });

  it('an accepted answer ends the round with its tier points', () => {
    const s = run([
      { type: 'start', now: T0 },
      { type: 'submit', input: 'nila', now: T0 + 3 * S },
    ]);
    expect(s.phase).toBe('reveal');
    expect(s.rounds[0]!.result).toEqual({
      outcome: 'edelweiss',
      answerId: 'nila',
      points: 100,
      fuzzy: false,
    });
    expect(s.rounds[0]!.finishedAt).toBe(T0 + 3 * S);
  });

  it('wrong answers cost 2 seconds and show feedback', () => {
    const s = run([
      { type: 'start', now: T0 },
      { type: 'submit', input: 'Hitam', now: T0 + S },
      { type: 'submit', input: 'Coklat', now: T0 + 2 * S },
    ]);
    expect(s.phase).toBe('playing');
    expect(s.rounds[0]!.attempts.map((a) => a.kind)).toEqual(['rejected', 'unknown']);
    expect(s.feedback).toEqual({ kind: 'unknown', input: 'Coklat' });
    const left = remainingMs(s.rounds[0]!, T0 + 2 * S);
    expect(left).toBe((ROUND_SECONDS - 2 - 2 * WRONG_PENALTY_SECONDS) * S);
  });

  it('shows the rejected reason', () => {
    const s = run([
      { type: 'start', now: T0 },
      { type: 'submit', input: 'hitam', now: T0 + S },
    ]);
    expect(s.feedback).toEqual({
      kind: 'rejected',
      input: 'hitam',
      reason: 'Hitam tidak ada di pelangi.',
    });
  });

  it('too-short and repeated answers cost no time', () => {
    const s = run([
      { type: 'start', now: T0 },
      { type: 'submit', input: 'x', now: T0 + S },
      { type: 'submit', input: 'coklat', now: T0 + S },
      { type: 'submit', input: 'COKLAT!', now: T0 + S },
    ]);
    expect(s.rounds[0]!.attempts).toHaveLength(1);
    expect(s.feedback).toEqual({ kind: 'duplicate', input: 'COKLAT!' });
    expect(remainingMs(s.rounds[0]!, T0 + S)).toBe((ROUND_SECONDS - 1 - 2) * S);
  });

  it('time running out turns the round into fog', () => {
    const started = run([{ type: 'start', now: T0 }]);
    expect(run([{ type: 'tick', now: T0 + (ROUND_SECONDS * S - 1) }], started)).toBe(started);
    const s = run([{ type: 'tick', now: T0 + ROUND_SECONDS * S }], started);
    expect(s.phase).toBe('reveal');
    expect(s.rounds[0]!.result).toEqual({
      outcome: 'fog',
      answerId: null,
      points: 0,
      fuzzy: false,
    });
  });

  it('a late submit is fog, not accepted', () => {
    const s = run([
      { type: 'start', now: T0 },
      { type: 'submit', input: 'merah', now: T0 + ROUND_SECONDS * S + 1 },
    ]);
    expect(s.rounds[0]!.result?.outcome).toBe('fog');
  });

  it('a penalty that uses up the last seconds ends the round', () => {
    const s = run([
      { type: 'start', now: T0 },
      { type: 'submit', input: 'coklat', now: T0 + 24 * S },
    ]);
    expect(s.phase).toBe('reveal');
    expect(s.rounds[0]!.result?.outcome).toBe('fog');
  });

  it('next starts the following round at that moment', () => {
    const s = run([
      { type: 'start', now: T0 },
      { type: 'submit', input: 'merah', now: T0 + S },
      { type: 'next', now: T0 + 60 * S },
    ]);
    expect(s.phase).toBe('playing');
    expect(s.current).toBe(1);
    expect(s.rounds[1]!.startedAt).toBe(T0 + 60 * S);
  });

  it('finishes after the seventh round', () => {
    let s = run([{ type: 'start', now: T0 }]);
    let t = T0; // start of the current round
    for (let i = 0; i < 7; i++) {
      const answer = payload.prompts[i]!.answers[0]!.text;
      s = run(
        [
          { type: 'submit', input: answer, now: t + S },
          { type: 'next', now: t + 2 * S },
        ],
        s,
      );
      t += 2 * S;
    }
    expect(s.phase).toBe('finished');
    expect(s.rounds.every((r) => r.result?.outcome === 'basecamp')).toBe(true);
    // Further actions do nothing.
    expect(run([{ type: 'submit', input: 'x', now: T0 }], s)).toBe(s);
    expect(run([{ type: 'start', now: T0 }], s)).toBe(s);
  });

  it('ignores submits outside the playing phase', () => {
    const idle = createDailyState(payload);
    expect(run([{ type: 'submit', input: 'merah', now: T0 }], idle)).toBe(idle);
  });

  it('caps input at 60 characters', () => {
    const s = run([
      { type: 'start', now: T0 },
      { type: 'submit', input: 'z'.repeat(100), now: T0 + S },
    ]);
    expect(s.rounds[0]!.attempts[0]!.input).toHaveLength(60);
  });
});

describe('remainingMs', () => {
  it('is derived from startedAt and penalties', () => {
    const s = run([{ type: 'start', now: T0 }]);
    expect(remainingMs(s.rounds[0]!, T0 + 10 * S)).toBe(15 * S);
  });

  it('never exceeds the round length if the clock goes backwards', () => {
    const s = run([{ type: 'start', now: T0 }]);
    expect(remainingMs(s.rounds[0]!, T0 - 60 * S)).toBe(ROUND_SECONDS * S);
  });
});

describe('restoreDailyState (resume after closing the tab)', () => {
  const playing = run([
    { type: 'start', now: T0 },
    { type: 'submit', input: 'coklat', now: T0 + S },
  ]);
  const saved = JSON.parse(JSON.stringify(playing)) as unknown;

  it('continues the timer from startedAt', () => {
    const s = restoreDailyState(saved, payload, T0 + 10 * S);
    expect(s.phase).toBe('playing');
    expect(remainingMs(s.rounds[0]!, T0 + 10 * S)).toBe((ROUND_SECONDS - 10 - 2) * S);
  });

  it('turns an expired round into fog', () => {
    const s = restoreDailyState(saved, payload, T0 + 3600 * S);
    expect(s.phase).toBe('reveal');
    expect(s.rounds[0]!.result?.outcome).toBe('fog');
  });

  it('starts fresh for another date or garbage', () => {
    expect(restoreDailyState({ ...playing, date: '2026-11-30' }, payload, T0).phase).toBe('idle');
    expect(restoreDailyState('nope', payload, T0).phase).toBe('idle');
    expect(restoreDailyState(null, payload, T0).phase).toBe('idle');
    expect(restoreDailyState({ ...playing, rounds: [] }, payload, T0).phase).toBe('idle');
  });

  it('starts fresh when the saved phase is inconsistent', () => {
    const broken = { ...playing, phase: 'reveal' };
    expect(restoreDailyState(broken, payload, T0).phase).toBe('idle');
  });

  it('moves an unfinished round to a hotfixed prompt, keeping its start time', () => {
    const swapped: DailyPayload = {
      ...payload,
      prompts: [{ ...payload.prompts[0]!, id: 'fixture-pelangi-002' }, ...payload.prompts.slice(1)],
    };
    const s = restoreDailyState(saved, swapped, T0 + 5 * S);
    expect(s.rounds[0]!.promptId).toBe('fixture-pelangi-002');
    expect(s.rounds[0]!.startedAt).toBe(T0);
    expect(s.rounds[0]!.attempts).toEqual([]);
  });

  it('never restores transient feedback', () => {
    expect(restoreDailyState(saved, payload, T0 + 2 * S).feedback).toBeNull();
  });
});
