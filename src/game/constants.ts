import type { Tier } from './types';

// Tuning values. Keep in sync with docs/02-game-design.md §8.
export const ROUNDS_PER_DAY = 7;
export const ROUND_SECONDS = 25;
export const WRONG_PENALTY_SECONDS = 2;
export const METERS_PER_POINT = 7;
export const POINTS: Record<Tier, number> = {
  basecamp: 10,
  camp: 30,
  treeline: 60,
  summit: 85,
  edelweiss: 100,
};
export const EXPEDITION_START_SECONDS = 45;
export const EXPEDITION_BONUS: Record<Tier, number> = {
  basecamp: 5,
  camp: 7,
  treeline: 9,
  summit: 12,
  edelweiss: 16,
};
export const EXPEDITION_SKIP_PENALTY = 3;
export const RESET_TIMEZONE = 'Asia/Jakarta';
export const GROUP_MAX_MEMBERS = 50;
export const GROUP_MAX_PER_PLAYER = 10;

export const TITLES = [
  { min: 0, title: 'Pendaki Pemula' },
  { min: 1000, title: 'Pendaki Akhir Pekan' },
  { min: 2000, title: 'Anak Gunung' },
  { min: 3000, title: 'Pemburu Puncak' },
  { min: 4000, title: 'Legenda Jalur' },
  { min: 4900, title: 'Penakluk Cartenz' },
] as const;

// Matching (docs/05-teknis.md §5.2, docs/02-game-design.md §9).
export const MIN_ANSWER_LENGTH = 2;
/** Max typo distance by normalized input length: ≤4 → 0, 5–8 → 1, ≥9 → 2. */
export const TYPO_TOLERANCE = [
  { minLength: 9, maxDistance: 2 },
  { minLength: 5, maxDistance: 1 },
  { minLength: 0, maxDistance: 0 },
] as const;
/** Input is capped at 60 characters (docs/07-privasi.md §3). */
export const MAX_INPUT_LENGTH = 60;

// Timer UI (docs/04-art-ui.md §3, §9).
export const WARNING_SECONDS = 5;
export const ANNOUNCE_AT_SECONDS = [10, 5] as const;

// Storage & content rules (docs/05-teknis.md §3, §8, docs/03-konten-soal.md).
export const DAILY_RETENTION_DAYS = 14;
export const REPEAT_MIN_DAYS = 30;
export const MIN_ANSWERS_OPEN = 50;
export const MIN_ANSWERS_CLOSED = 30;
export const EDELWEISS_FACT_MAX = 160;
export const REJECTED_REASON_MAX = 120;
export const MOUNTAIN_FACT_MAX = 140;

/** Retry interval when today's payload is not published yet (docs/05-teknis.md §9). */
export const DAILY_RETRY_MS = 60_000;
