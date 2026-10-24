import { MIN_ANSWER_LENGTH, TYPO_TOLERANCE } from './constants';
import { normalize } from './normalize';
import type { Prompt, Tier } from './types';

export type MatchResult =
  | { kind: 'accepted'; answerId: string; tier: Tier; fuzzy: boolean }
  | { kind: 'rejected'; reason: string }
  | { kind: 'unknown' }
  | { kind: 'too_short' }
  | { kind: 'duplicate' };

export type EntryRef =
  | { type: 'answer'; answerId: string; tier: Tier }
  | { type: 'rejected'; index: number; reason: string };

export interface KeyEntry {
  key: string;
  /** The text or alias this key came from (for validator messages). */
  source: string;
  ref: EntryRef;
}

export interface MatchIndex {
  prefixes: string[];
  exact: Map<string, EntryRef>;
  keys: { chars: string[]; ref: EntryRef }[];
}

/** Stable identity of an entry, used to tell "same entry" from "different entries". */
export function refId(ref: EntryRef): string {
  return ref.type === 'answer' ? `a:${ref.answerId}` : `r:${ref.index}`;
}

/** Every normalized key of a prompt (answer texts, answer aliases, rejected texts & aliases). */
export function collectKeys(prompt: Prompt): KeyEntry[] {
  const prefixes = prompt.optionalPrefixes ?? [];
  const out: KeyEntry[] = [];
  for (const a of prompt.answers) {
    const ref: EntryRef = { type: 'answer', answerId: a.id, tier: a.tier };
    for (const source of [a.text, ...(a.aliases ?? [])]) {
      out.push({ key: normalize(source, prefixes), source, ref });
    }
  }
  (prompt.rejected ?? []).forEach((r, index) => {
    const ref: EntryRef = { type: 'rejected', index, reason: r.reason };
    for (const source of [r.text, ...(r.aliases ?? [])]) {
      out.push({ key: normalize(source, prefixes), source, ref });
    }
  });
  return out;
}

/** Build the lookup index for one prompt. Built once when the payload loads. */
export function buildIndex(prompt: Prompt): MatchIndex {
  const exact = new Map<string, EntryRef>();
  for (const { key, ref } of collectKeys(prompt)) {
    // The validator rejects collisions; if one slips through, the first entry wins.
    if (key && !exact.has(key)) exact.set(key, ref);
  }
  const keys = [...exact].map(([key, ref]) => ({ chars: Array.from(key), ref }));
  return { prefixes: prompt.optionalPrefixes ?? [], exact, keys };
}

export function maxTypoDistance(length: number): number {
  for (const t of TYPO_TOLERANCE) if (length >= t.minLength) return t.maxDistance;
  return 0;
}

/**
 * Optimal string alignment distance (Damerau-Levenshtein with adjacent transpositions).
 * Returns `limit + 1` as soon as the distance is known to exceed `limit`.
 */
export function osaDistance(a: readonly string[], b: readonly string[], limit: number): number {
  if (Math.abs(a.length - b.length) > limit) return limit + 1;
  const cols = b.length + 1;
  let prev2 = new Array<number>(cols).fill(0);
  let prev = Array.from({ length: cols }, (_, j) => j);
  let cur = new Array<number>(cols).fill(0);
  for (let i = 1; i <= a.length; i++) {
    cur[0] = i;
    let rowMin = cur[0];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(prev[j]! + 1, cur[j - 1]! + 1, prev[j - 1]! + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        v = Math.min(v, prev2[j - 2]! + 1);
      }
      cur[j] = v;
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > limit) return limit + 1;
    [prev2, prev, cur] = [prev, cur, prev2];
  }
  const d = prev[b.length]!;
  return d > limit ? limit + 1 : d;
}

function toResult(ref: EntryRef, fuzzy: boolean): MatchResult {
  return ref.type === 'answer'
    ? { kind: 'accepted', answerId: ref.answerId, tier: ref.tier, fuzzy }
    : { kind: 'rejected', reason: ref.reason };
}

/**
 * Match a player's input against a prompt index (docs/05-teknis.md §5.2).
 * `previousKeys` are the normalized inputs already tried this round.
 */
export function matchAnswer(
  index: MatchIndex,
  input: string,
  previousKeys: readonly string[] = [],
): MatchResult {
  const n = normalize(input, index.prefixes);
  if (n.length < MIN_ANSWER_LENGTH) return { kind: 'too_short' };
  if (previousKeys.includes(n)) return { kind: 'duplicate' };

  const hit = index.exact.get(n);
  if (hit) return toResult(hit, false);

  const limit = maxTypoDistance(n.length);
  if (limit === 0) return { kind: 'unknown' };

  const chars = Array.from(n);
  let best = limit + 1;
  let candidates = new Map<string, EntryRef>();
  for (const k of index.keys) {
    const d = osaDistance(chars, k.chars, Math.min(limit, best));
    if (d > limit || d > best) continue;
    if (d < best) {
      best = d;
      candidates = new Map();
    }
    candidates.set(refId(k.ref), k.ref);
  }
  if (candidates.size !== 1) return { kind: 'unknown' }; // none, or ambiguous
  const [ref] = candidates.values();
  return toResult(ref!, true);
}
