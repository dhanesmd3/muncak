// Daily job at 00:00 WIB (docs/05-teknis.md §10.3, docs/07-privasi.md §2).
import {
  ANSWER_LOG_RETENTION_DAYS,
  ERROR_LOG_RETENTION_DAYS,
  GROUP_INACTIVE_DAYS,
  MEMBER_RETENTION_DAYS,
  SALT_KEEP_DAYS,
  TIER_SNAPSHOT_KEEP_DAYS,
} from '../../src/game/constants';
import { addDays, todayWIB } from '../../src/game/date';
import { frozenPayload } from './content';
import type { Env, WorkerContent } from './env';
import { deleteEmptyGroups } from './groups';
import { sqlTime } from './http';
import { saltFor } from './identity';

const daysAgo = (now: Date, days: number) => sqlTime(new Date(now.getTime() - days * 86_400_000));

export async function runDailyCron(env: Env, content: WorkerContent, now: Date): Promise<void> {
  const db = env.DB;
  const today = todayWIB(now);

  // New salt for today; salts older than 2 days are deleted, which makes their logs anonymous.
  await saltFor(db, today);
  // Freeze today's tiers before the first player arrives.
  await frozenPayload(db, content, today);

  const logCutoff = addDays(today, -ANSWER_LOG_RETENTION_DAYS);
  await db.batch([
    db
      .prepare('DELETE FROM daily_salts WHERE play_date <= ?')
      .bind(addDays(today, -SALT_KEEP_DAYS)),
    db
      .prepare('DELETE FROM tier_snapshots WHERE play_date < ?')
      .bind(addDays(today, -TIER_SNAPSHOT_KEEP_DAYS)),
    db.prepare('DELETE FROM rate_limits WHERE play_date < ?').bind(addDays(today, -1)),

    // Rombongan inactive for 90 days.
    db
      .prepare(
        `DELETE FROM group_members WHERE group_code IN
         (SELECT code FROM groups WHERE last_active_at < ?)`,
      )
      .bind(daysAgo(now, GROUP_INACTIVE_DAYS)),
    db
      .prepare('DELETE FROM groups WHERE last_active_at < ?')
      .bind(daysAgo(now, GROUP_INACTIVE_DAYS)),

    // Members and scores: 12 months.
    db
      .prepare('DELETE FROM daily_scores WHERE play_date < ?')
      .bind(addDays(today, -MEMBER_RETENTION_DAYS)),
    db
      .prepare(
        `DELETE FROM group_members WHERE joined_at < ?
         AND member_id NOT IN (SELECT member_id FROM daily_scores)`,
      )
      .bind(daysAgo(now, MEMBER_RETENTION_DAYS)),
    deleteEmptyGroups(db),

    // Answer logs: after 24 months only counts remain.
    db
      .prepare(
        `INSERT INTO answer_aggregates (prompt_id, mode, input_norm, outcome, answer_id, count)
         SELECT prompt_id, mode, input_norm, outcome, COALESCE(answer_id, ''), COUNT(*)
         FROM answer_logs WHERE play_date < ?
         GROUP BY prompt_id, mode, input_norm, outcome, COALESCE(answer_id, '')
         ON CONFLICT (prompt_id, mode, input_norm, outcome, answer_id)
         DO UPDATE SET count = count + excluded.count`,
      )
      .bind(logCutoff),
    db.prepare('DELETE FROM answer_logs WHERE play_date < ?').bind(logCutoff),

    db
      .prepare('DELETE FROM error_logs WHERE created_at < ?')
      .bind(daysAgo(now, ERROR_LOG_RETENTION_DAYS)),
  ]);
}
