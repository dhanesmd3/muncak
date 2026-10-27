import { ROUNDS_PER_DAY } from './constants';
import { isValidDate } from './date';
import { decodePayload } from './payload';
import type { DailyPayload, Prompt, Tier } from './types';

const TIERS: readonly Tier[] = ['basecamp', 'camp', 'treeline', 'summit', 'edelweiss'];

/** Path of a day's payload, relative to the app base URL. */
export function dailyPath(date: string): string {
  return `daily/${date}.json`;
}

const isStr = (x: unknown): x is string => typeof x === 'string';
const isStrArr = (x: unknown) => x === undefined || (Array.isArray(x) && x.every(isStr));

/** Structural check of one prompt, so a bad file fails loudly instead of mid-game. */
export function isPrompt(q: unknown): q is Prompt {
  if (!q || typeof q !== 'object') return false;
  const p = q as Prompt;
  return (
    isStr(p.id) &&
    isStr(p.prompt) &&
    isStr(p.edelweissFact) &&
    isStrArr(p.optionalPrefixes) &&
    Array.isArray(p.answers) &&
    p.answers.length > 0 &&
    p.answers.every(
      (a) => a && isStr(a.id) && isStr(a.text) && isStrArr(a.aliases) && TIERS.includes(a.tier),
    ) &&
    p.answers.filter((a) => a.tier === 'edelweiss').length === 1 &&
    (p.rejected === undefined ||
      (Array.isArray(p.rejected) &&
        p.rejected.every((r) => r && isStr(r.text) && isStr(r.reason) && isStrArr(r.aliases))))
  );
}

/** Structural check of a decoded daily payload. */
export function isDailyPayload(value: unknown): value is DailyPayload {
  if (!value || typeof value !== 'object') return false;
  const p = value as DailyPayload;
  if (!isStr(p.date) || !isValidDate(p.date) || !Number.isInteger(p.dayNumber)) return false;
  return (
    Array.isArray(p.prompts) && p.prompts.length === ROUNDS_PER_DAY && p.prompts.every(isPrompt)
  );
}

/** Decode and check a daily payload file for `date`. Throws if it is unusable. */
export function parseDailyFile(text: string, key: string, date: string): DailyPayload {
  const value = decodePayload(text, key);
  if (!isDailyPayload(value)) throw new Error('Invalid daily payload');
  if (value.date !== date) throw new Error(`Payload is for ${value.date}, expected ${date}`);
  return value;
}
