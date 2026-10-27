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

// Rarity from player data (docs/05-teknis.md §10.4). Tune once real data exists.
export const RARITY_MIN_ROUNDS = 200;
export const RARITY_PRIOR_WEIGHT = 50; // k
export const RARITY_PRIOR: Record<Exclude<Tier, 'edelweiss'>, number> = {
  basecamp: 0.15,
  camp: 0.06,
  treeline: 0.02,
  summit: 0.005,
};
/** share ≥ min → tier, checked top to bottom. */
export const RARITY_THRESHOLDS = [
  { min: 0.1, tier: 'basecamp' },
  { min: 0.03, tier: 'camp' },
  { min: 0.01, tier: 'treeline' },
  { min: 0, tier: 'summit' },
] as const;

// Backend (docs/05-teknis.md §10).
export const NAME_MAX_LENGTH = 20; // group name & nickname
export const GROUP_INACTIVE_DAYS = 90;
export const MEMBER_RETENTION_DAYS = 365;
export const ANSWER_LOG_RETENTION_DAYS = 730;
export const ERROR_LOG_RETENTION_DAYS = 30;
export const SALT_KEEP_DAYS = 2;
export const TIER_SNAPSHOT_KEEP_DAYS = 7;
export const MAX_PLAYS_PER_DAY = 20;
export const MAX_SUGGESTIONS_PER_DAY = 30;
export const MAX_GROUP_CREATES_PER_DAY = 5;
export const MAX_GROUP_JOINS_PER_DAY = 20;
export const MAX_ATTEMPTS_PER_ROUND = 40;
export const MAX_EXPEDITION_ROUNDS = 200;
/** Server clock is trusted when the device clock is off by more than this (docs/05-teknis.md §4). */
export const CLOCK_SKEW_TOLERANCE_MS = 5 * 60 * 1000;
/** Unknown answers are shown to editors only when typed from at least this many devices. */
export const UNKNOWN_MIN_DEVICES = 3;
export const UNKNOWN_REPORT_SIZE = 20;
