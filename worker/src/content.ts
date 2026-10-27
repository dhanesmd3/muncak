import { dayNumber } from '../../src/game/date';
import { applyTiers, tiersOf, type TierMap } from '../../src/game/rarity';
import type { DailyPayload, Prompt } from '../../src/game/types';
import type { D1Database, WorkerContent } from './env';

type Snapshot = Record<string, TierMap>;

/**
 * The day's payload with tiers frozen for the whole day (docs/02-game-design.md §2.2).
 * The first request of the day (or the 00:00 WIB cron) stores the tiers; every later
 * request — even after a redeploy with new rarity data — uses that snapshot.
 */
export async function frozenPayload(
  db: D1Database,
  content: WorkerContent,
  date: string,
): Promise<DailyPayload | null> {
  const prompts = content.days[date];
  if (!prompts) return null;
  const select = db.prepare('SELECT tiers FROM tier_snapshots WHERE play_date = ?').bind(date);
  let row = await select.first<{ tiers: string }>();
  if (!row) {
    const snapshot: Snapshot = Object.fromEntries(prompts.map((p) => [p.id, tiersOf(p)]));
    await db
      .prepare('INSERT OR IGNORE INTO tier_snapshots (play_date, tiers) VALUES (?, ?)')
      .bind(date, JSON.stringify(snapshot))
      .run();
    row = await select.first<{ tiers: string }>();
  }
  const snapshot = (row ? JSON.parse(row.tiers) : {}) as Snapshot;
  return {
    date,
    dayNumber: dayNumber(date, content.launchDate),
    // A prompt swapped by a same-day hotfix has no snapshot entry and keeps its own tiers.
    prompts: prompts.map((p) => applyTiers(p, snapshot[p.id])),
  };
}

export function bankIndex(content: WorkerContent): Map<string, Prompt> {
  return new Map(content.bank.map((p) => [p.id, p]));
}

/** Prompts a suggestion may refer to: any bundled daily or bank prompt. */
export function findPrompt(content: WorkerContent, promptId: string): Prompt | undefined {
  for (const prompts of Object.values(content.days)) {
    const p = prompts.find((x) => x.id === promptId);
    if (p) return p;
  }
  return content.bank.find((p) => p.id === promptId);
}
