// Simple profanity filter for group names and nicknames (docs/02-game-design.md §5.3).
// Matches whole words after normalizing and undoing common letter swaps (0→o, 1→i, …),
// plus a few words that are never part of an innocent name, even inside another word.
import { normalizeBase } from '../../src/game/normalize';

const WORDS = [
  'anjing',
  'anjir',
  'asu',
  'babi',
  'bajingan',
  'bangsat',
  'bego',
  'bencong',
  'brengsek',
  'goblok',
  'goblog',
  'jancok',
  'jancuk',
  'jembut',
  'kampret',
  'keparat',
  'kontol',
  'lonte',
  'memek',
  'ngentot',
  'pantek',
  'peler',
  'pelacur',
  'perek',
  'tai',
  'taik',
  'tolol',
  'fuck',
  'shit',
  'bitch',
];
const ALWAYS = ['kontol', 'memek', 'ngentot', 'jancok', 'jancuk', 'bangsat', 'lonte', 'fuck'];

const LEET: Record<string, string> = {
  '0': 'o',
  '1': 'i',
  '3': 'e',
  '4': 'a',
  '5': 's',
  '7': 't',
  '@': 'a',
  $: 's',
};

export function isBadName(name: string): boolean {
  const unleet = [...name.toLowerCase()].map((c) => LEET[c] ?? c).join('');
  const words = normalizeBase(unleet).split(' ');
  // Also collapse repeated letters ("anjiiing") for matching.
  const variants = words.flatMap((w) => [w, w.replace(/(.)\1+/g, '$1')]);
  if (variants.some((w) => WORDS.includes(w))) return true;
  const squashed = words.join('');
  return ALWAYS.some((w) => squashed.includes(w) || squashed.replace(/(.)\1+/g, '$1').includes(w));
}
