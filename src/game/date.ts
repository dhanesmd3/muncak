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
