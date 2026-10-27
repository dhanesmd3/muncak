import type { PackInfo } from './types';

/** Is a pack available on `date` (YYYY-MM-DD, WIB)? Seasons are inclusive and may wrap the year end. */
export function inSeason(pack: Pick<PackInfo, 'season'>, date: string): boolean {
  if (!pack.season) return true;
  const md = date.slice(5);
  const { from, to } = pack.season;
  return from <= to ? md >= from && md <= to : md >= from || md <= to;
}
