// Device storage for Rombongan, Ekspedisi and Paket Tema (docs/05-teknis.md §8).
import type { MyGroup } from '../game/groups';
import type { PlayRequest } from '../game/play';
import type { Outcome } from '../game/types';
import { KEYS, readJson, writeJson } from './storage';

const isStr = (x: unknown): x is string => typeof x === 'string';

export function loadGroups(): MyGroup[] {
  const v = readJson<unknown>(KEYS.groups);
  if (!Array.isArray(v)) return [];
  return v.filter((g): g is MyGroup => !!g && isStr(g.code) && isStr(g.name) && isStr(g.nickname));
}

export function saveGroups(groups: MyGroup[]): void {
  writeJson(KEYS.groups, groups);
}

export function loadPendingPlay(): PlayRequest | null {
  const v = readJson<PlayRequest>(KEYS.pendingPlay);
  return v && isStr(v.date) && Array.isArray(v.rounds) ? v : null;
}

export function savePendingPlay(play: PlayRequest | null): void {
  writeJson(KEYS.pendingPlay, play);
}

export interface ExpeditionRecord {
  bestAltitude: number;
  runs: number;
}

export function loadExpeditionRecord(): ExpeditionRecord {
  const v = readJson<Partial<ExpeditionRecord>>(KEYS.expedition);
  return {
    bestAltitude: typeof v?.bestAltitude === 'number' ? v.bestAltitude : 0,
    runs: typeof v?.runs === 'number' ? v.runs : 0,
  };
}

export function recordExpedition(altitude: number): ExpeditionRecord {
  const prev = loadExpeditionRecord();
  const next = { bestAltitude: Math.max(prev.bestAltitude, altitude), runs: prev.runs + 1 };
  writeJson(KEYS.expedition, next);
  return next;
}

export interface PackBest {
  altitude: number;
  outcomes: Outcome[];
}

export function loadPackBests(): Record<string, PackBest> {
  const v = readJson<Record<string, PackBest>>(KEYS.packs);
  if (!v || typeof v !== 'object') return {};
  return Object.fromEntries(
    Object.entries(v).filter(
      ([, b]) => typeof b?.altitude === 'number' && Array.isArray(b.outcomes),
    ),
  );
}

/** Only the best score per pack is kept (docs/02-game-design.md §5.2). */
export function recordPack(id: string, best: PackBest): Record<string, PackBest> {
  const all = loadPackBests();
  if (!all[id] || best.altitude > all[id].altitude) all[id] = best;
  writeJson(KEYS.packs, all);
  return all;
}
