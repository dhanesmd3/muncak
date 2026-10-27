// Rombongan rules shared by the Worker and the client (docs/02-game-design.md §5.3).
import { NAME_MAX_LENGTH } from './constants';
import type { Outcome } from './types';

/** Code alphabet without look-alikes (0/O, 1/I/L). */
export const CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
export const CODE_PATTERN = /^MCK-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}$/;

export function makeGroupCode(random: () => number): string {
  let s = '';
  for (let i = 0; i < 4; i++) s += CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length)];
  return `MCK-${s}`;
}

/** Normalize a typed code: "mck 7k3q" → "MCK-7K3Q". Returns null if it cannot be a code. */
export function parseGroupCode(input: string): string | null {
  const s = input.toUpperCase().replace(/[^0-9A-Z]/g, '');
  const body = s.startsWith('MCK') ? s.slice(3) : s;
  const code = `MCK-${body}`;
  return CODE_PATTERN.test(code) ? code : null;
}

/** Collapse whitespace and trim; null when empty or longer than NAME_MAX_LENGTH characters. */
export function cleanName(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const s = input.replace(/\s+/g, ' ').trim();
  if (!s || Array.from(s).length > NAME_MAX_LENGTH) return null;
  return s;
}

export interface MemberScore {
  altitude: number;
  tiers: Outcome[];
}

export interface GroupMemberView {
  nickname: string;
  isMe: boolean;
  /** Today's score; null = not played yet (or hidden until you play). */
  today: MemberScore | null;
  /** Total mdpl Monday–Sunday. */
  week: number;
}

export interface GroupView {
  code: string;
  name: string;
  memberCount: number;
  /** False for a visitor who has not joined: nicknames and scores are not sent. */
  isMember: boolean;
  /** False until the requester has a score for `date` (no spoilers). */
  revealed: boolean;
  date: string;
  members: GroupMemberView[];
  edelweissFinders: string[];
}

export interface MyGroup {
  code: string;
  name: string;
  nickname: string;
}
