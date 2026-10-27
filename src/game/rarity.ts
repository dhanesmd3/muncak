// Rarity tiers from player data (docs/05-teknis.md §10.4).
import {
  RARITY_MIN_ROUNDS,
  RARITY_PRIOR,
  RARITY_PRIOR_WEIGHT,
  RARITY_THRESHOLDS,
} from './constants';
import type { Answer, Prompt, Tier } from './types';

export interface PromptCounts {
  /** Accepted daily rounds for this prompt (N). */
  rounds: number;
  /** answerId → how often it was the accepted answer. */
  counts: Record<string, number>;
}

/** answerId → tier, for one prompt. */
export type TierMap = Record<string, Tier>;

export function tierForShare(share: number): Tier {
  for (const t of RARITY_THRESHOLDS) if (share >= t.min) return t.tier;
  return 'summit';
}

/**
 * New tiers for one prompt. Below RARITY_MIN_ROUNDS the manual tiers stay.
 * Edelweiss is the editor's choice and never changes.
 */
export function computeTiers(answers: readonly Answer[], data: PromptCounts): TierMap {
  const out: TierMap = {};
  const n = data.rounds;
  const k = RARITY_PRIOR_WEIGHT;
  for (const a of answers) {
    if (a.tier === 'edelweiss' || n < RARITY_MIN_ROUNDS) {
      out[a.id] = a.tier;
      continue;
    }
    const share = ((data.counts[a.id] ?? 0) + k * RARITY_PRIOR[a.tier]) / (n + k);
    out[a.id] = tierForShare(share);
  }
  return out;
}

/**
 * Apply data tiers to a prompt. Answers missing from the map (e.g. added later) keep
 * their manual tier, and nothing can become or stop being Edelweiss.
 */
export function applyTiers(prompt: Prompt, tiers: TierMap | undefined): Prompt {
  if (!tiers) return prompt;
  return {
    ...prompt,
    answers: prompt.answers.map((a) => {
      const t = tiers[a.id];
      if (!t || a.tier === 'edelweiss' || t === 'edelweiss') return a;
      return { ...a, tier: t };
    }),
  };
}

/** Current tiers of a prompt, for snapshots. */
export function tiersOf(prompt: Prompt): TierMap {
  return Object.fromEntries(prompt.answers.map((a) => [a.id, a.tier]));
}
