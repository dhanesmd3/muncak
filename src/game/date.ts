const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Today's date in WIB (UTC+7, no DST), formatted YYYY-MM-DD. */
export function todayWIB(now: Date = new Date()): string {
  return new Date(now.getTime() + WIB_OFFSET_MS).toISOString().slice(0, 10);
}

/** Day number since launch. Launch day = 1. */
export function dayNumber(date: string, launchDate: string): number {
  return Math.round((Date.parse(date) - Date.parse(launchDate)) / DAY_MS) + 1;
}

/** Milliseconds until the next 00:00 WIB. */
export function msUntilNextReset(now: Date = new Date()): number {
  const wib = now.getTime() + WIB_OFFSET_MS;
  const nextMidnightWib = Math.floor(wib / DAY_MS) * DAY_MS + DAY_MS;
  return nextMidnightWib - wib;
}

/** Shift a YYYY-MM-DD date by whole days (calendar arithmetic, no time zone involved). */
export function addDays(date: string, days: number): string {
  return new Date(Date.parse(date) + days * DAY_MS).toISOString().slice(0, 10);
}

/** Whole days from `from` to `to` (both YYYY-MM-DD). */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(to) - Date.parse(from)) / DAY_MS);
}

/** Part of the day for the scene palette (docs/04-art-ui.md §5.2, layer 7). */
export type TimeOfDay = 'morning' | 'day' | 'evening' | 'night';

/**
 * Part of the day by WIB hour, whatever the device time zone:
 * morning 05:00–09:59 · day 10:00–14:59 · evening 15:00–17:59 · night 18:00–04:59.
 */
export function timeOfDayWIB(now: Date = new Date()): TimeOfDay {
  const hour = new Date(now.getTime() + WIB_OFFSET_MS).getUTCHours();
  if (hour >= 5 && hour < 10) return 'morning';
  if (hour >= 10 && hour < 15) return 'day';
  if (hour >= 15 && hour < 18) return 'evening';
  return 'night';
}

/** Monday of the (Monday–Sunday) week containing `date`. */
export function mondayOf(date: string): string {
  const dow = new Date(Date.parse(date)).getUTCDay(); // 0 = Sunday
  return addDays(date, -((dow + 6) % 7));
}

/** True for a real calendar date in YYYY-MM-DD form. */
export function isValidDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const t = Date.parse(date);
  return !Number.isNaN(t) && new Date(t).toISOString().slice(0, 10) === date;
}

/** Format a duration as HH:MM:SS (for "Soal baru dalam 06:12:40"). */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
}
