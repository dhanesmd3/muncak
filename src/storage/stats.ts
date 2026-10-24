import { sanitizeStats, type Stats } from '../game/stats';
import { KEYS, readJson, writeJson } from './storage';

export function loadStats(): Stats {
  return sanitizeStats(readJson(KEYS.stats));
}

export function saveStats(stats: Stats): void {
  writeJson(KEYS.stats, stats);
}
