import { ROUNDS_PER_DAY } from './constants';
import { isValidDate } from './date';
import { decodePayload } from './payload';
import type { DailyPayload, Tier } from './types';

const TIERS: readonly Tier[] = ['basecamp', 'camp', 'treeline', 'summit', 'edelweiss'];

/** Path of a day's payload, relative to the app base URL. */
export function dailyPath(date: string): string {
  return `daily/${date}.json`;
}

const isStr = (x: unknown): x is string => typeof x === 'string';
const isStrArr = (x: unknown) => x === undefined || (Array.isArray(x) && x.every(isStr));

/** Structural check of a decoded payload, so a bad file fails loudly instead of mid-game. */
export function isDailyPayload(value: unknown): value is DailyPayload {
  if (!value || typeof value !== 'object') return false;
  const p = value as DailyPayload;
  if (!isStr(p.date) || !isValidDate(p.date) || !Number.isInteger(p.dayNumber)) return false;
  if (!Array.isArray(p.prompts) || p.prompts.length !== ROUNDS_PER_DAY) return false;
  return p.prompts.every(
    (q) =>
      q &&
      isStr(q.id) &&
      isStr(q.prompt) &&
      isStr(q.edelweissFact) &&
      isStrArr(q.optionalPrefixes) &&
      Array.isArray(q.answers) &&
      q.answers.length > 0 &&
      q.answers.every(
        (a) => a && isStr(a.id) && isStr(a.text) && isStrArr(a.aliases) && TIERS.includes(a.tier),
      ) &&
      q.answers.filter((a) => a.tier === 'edelweiss').length === 1 &&
      (q.rejected === undefined ||
        (Array.isArray(q.rejected) &&
          q.rejected.every((r) => r && isStr(r.text) && isStr(r.reason) && isStrArr(r.aliases)))),
  );
}

/** Decode and check a daily payload file for `date`. Throws if it is unusable. */
export function parseDailyFile(text: string, key: string, date: string): DailyPayload {
  const value = decodePayload(text, key);
  if (!isDailyPayload(value)) throw new Error('Invalid daily payload');
  if (value.date !== date) throw new Error(`Payload is for ${value.date}, expected ${date}`);
  return value;
}
