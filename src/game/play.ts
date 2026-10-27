// Re-scoring a finished session from raw inputs. The Worker runs this with the same
// match/scoring code as the client, so a client cannot simply claim "4.900 mdpl"
// (docs/05-teknis.md §10.3).
import { MAX_INPUT_LENGTH, ROUNDS_PER_DAY } from './constants';
import { buildIndex, matchAnswer } from './match';
import { normalize } from './normalize';
import { altitude, pointsFor } from './scoring';
import type { DailyState, Outcome, Prompt } from './types';

export type PlayMode = 'daily' | 'expedition' | 'pack';

export interface PlayRound {
  promptId: string;
  attempts: string[]; // raw inputs, in order
}

export interface PlayRequest {
  date: string;
  mode: PlayMode;
  rounds: PlayRound[];
}

export interface PlayResponse {
  altitude: number;
  tiers: Outcome[];
}

export interface LoggedAttempt {
  promptId: string;
  inputNorm: string;
  outcome: 'accepted' | 'rejected' | 'unknown';
  answerId: string | null;
}

/**
 * Replay the inputs of one round exactly like the reducer does: too-short and repeated
 * inputs are ignored, and the round ends at the first accepted answer.
 */
export function scoreRound(
  prompt: Prompt,
  inputs: readonly string[],
): { outcome: Outcome; answerId: string | null; logs: LoggedAttempt[] } {
  const index = buildIndex(prompt);
  const tried: string[] = [];
  const logs: LoggedAttempt[] = [];
  for (const raw of inputs) {
    const input = raw.trim().slice(0, MAX_INPUT_LENGTH);
    const key = normalize(input, index.prefixes);
    const r = matchAnswer(index, input, tried);
    if (r.kind === 'too_short' || r.kind === 'duplicate') continue;
    tried.push(key);
    if (r.kind === 'accepted') {
      logs.push({ promptId: prompt.id, inputNorm: key, outcome: 'accepted', answerId: r.answerId });
      return { outcome: r.tier, answerId: r.answerId, logs };
    }
    logs.push({ promptId: prompt.id, inputNorm: key, outcome: r.kind, answerId: null });
  }
  return { outcome: 'fog', answerId: null, logs };
}

/** Score a whole Muncak Harian. Throws if the rounds do not match the day's prompts. */
export function scoreDaily(
  prompts: readonly Prompt[],
  rounds: readonly PlayRound[],
): { response: PlayResponse; logs: LoggedAttempt[] } {
  if (rounds.length !== ROUNDS_PER_DAY || prompts.length !== ROUNDS_PER_DAY) {
    throw new Error('A daily play has exactly 7 rounds');
  }
  let points = 0;
  const tiers: Outcome[] = [];
  const logs: LoggedAttempt[] = [];
  rounds.forEach((round, i) => {
    const prompt = prompts[i]!;
    if (round.promptId !== prompt.id) throw new Error(`Round ${i + 1} is not ${prompt.id}`);
    const r = scoreRound(prompt, round.attempts);
    points += pointsFor(r.outcome);
    tiers.push(r.outcome);
    logs.push(...r.logs);
  });
  return { response: { altitude: altitude(points), tiers }, logs };
}

/** The request a finished daily session sends: raw inputs of every counted attempt. */
export function playFromDaily(state: DailyState): PlayRequest {
  return {
    date: state.date,
    mode: 'daily',
    rounds: state.rounds.map((r) => ({
      promptId: r.promptId,
      attempts: r.attempts.map((a) => a.input),
    })),
  };
}
