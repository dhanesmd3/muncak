export type Tier = 'basecamp' | 'camp' | 'treeline' | 'summit' | 'edelweiss';
export type Category =
  'nusantara' | 'global' | 'kuliner' | 'sejarah' | 'alam' | 'pop' | 'bola' | 'sains';
export type PromptStatus = 'draft' | 'review' | 'verified' | 'retired';
/** `daily` prompts may be scheduled for Muncak Harian; `bank` prompts feed Ekspedisi & Paket Tema. */
export type PromptPool = 'daily' | 'bank';

/** Round outcome: an accepted answer's tier, or `fog` when time ran out. */
export type Outcome = Tier | 'fog';

export interface Answer {
  id: string;
  text: string;
  aliases?: string[];
  tier: Tier;
}

export interface Rejected {
  text: string;
  aliases?: string[];
  reason: string;
}

export interface Prompt {
  id: string;
  prompt: string;
  category: Category;
  difficulty: 1 | 2 | 3 | 4 | 5;
  closedSet: boolean;
  pool?: PromptPool; // default 'daily'
  optionalPrefixes?: string[];
  answers: Answer[];
  rejected?: Rejected[];
  edelweissFact: string;
  sources: string[];
  status: PromptStatus;
  author: string;
  verifiedBy?: string;
  validAsOf: string; // YYYY-MM-DD
}

/** Payload sent to the browser for one day. */
export interface DailyPayload {
  date: string; // YYYY-MM-DD (WIB)
  dayNumber: number; // #42
  prompts: Prompt[]; // 7 prompts, already ordered, tiers frozen for this day
}

/** Paket Tema as listed in packs/index.json. `season` days are MM-DD (WIB), inclusive. */
export interface PackInfo {
  id: string;
  title: string;
  description: string;
  season?: { from: string; to: string };
}

/** One Paket Tema with its 7 prompts (packs/<id>.json). */
export interface PackPayload extends PackInfo {
  prompts: Prompt[];
}

/** Prompts for Ekspedisi (bank/expedition.json). */
export interface BankPayload {
  prompts: Prompt[];
}

export interface Mountain {
  id: string;
  name: string; // "Gunung Semeru"
  shortName: string; // "Semeru", used in share text
  altitude: number; // mdpl
  province: string;
  fact: string; // ≤ 140 characters
  source: string;
}

/** One penalised or accepted attempt within a round. */
export interface Attempt {
  input: string;
  key: string; // normalized input
  kind: 'accepted' | 'rejected' | 'unknown';
  at: number; // epoch ms
}

export interface RoundResult {
  outcome: Outcome;
  answerId: string | null;
  points: number;
  fuzzy: boolean;
}

export interface RoundState {
  promptId: string;
  startedAt: number | null; // epoch ms
  attempts: Attempt[];
  result: RoundResult | null;
  finishedAt: number | null; // epoch ms
}

export type DailyPhase = 'idle' | 'playing' | 'reveal' | 'finished';

/** Transient feedback for the latest submission (not part of the game record). */
export type Feedback =
  | { kind: 'rejected'; input: string; reason: string }
  | { kind: 'unknown'; input: string }
  | { kind: 'too_short'; input: string }
  | { kind: 'duplicate'; input: string };

export interface DailyState {
  version: 1;
  date: string;
  dayNumber: number;
  phase: DailyPhase;
  current: number; // index of the current round
  rounds: RoundState[];
  feedback: Feedback | null;
}
