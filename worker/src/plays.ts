import {
  MAX_ATTEMPTS_PER_ROUND,
  MAX_EXPEDITION_ROUNDS,
  MAX_INPUT_LENGTH,
  MAX_PLAYS_PER_DAY,
} from '../../src/game/constants';
import { addDays, isValidDate } from '../../src/game/date';
import {
  scoreDaily,
  scoreRound,
  type LoggedAttempt,
  type PlayMode,
  type PlayRequest,
  type PlayRound,
} from '../../src/game/play';
import { altitude, pointsFor } from '../../src/game/scoring';
import type { Outcome } from '../../src/game/types';
import { bankIndex, frozenPayload } from './content';
import type { D1Database, D1PreparedStatement, Env, WorkerContent } from './env';
import { HttpError, isObject, json, readJsonBody, sqlTime } from './http';
import { deviceHash, memberId, rateLimit, requireDevice } from './identity';

const MODES: PlayMode[] = ['daily', 'expedition', 'pack'];
/** Logged attempts per request, so one play cannot flood the log. */
const MAX_LOGGED = 500;
const MAX_RAW_INPUT = 200;

export function parsePlay(body: unknown): PlayRequest {
  if (!isObject(body)) throw new HttpError(400, 'bad_play');
  const { date, mode, rounds } = body;
  if (typeof date !== 'string' || !isValidDate(date)) throw new HttpError(400, 'bad_date');
  if (typeof mode !== 'string' || !MODES.includes(mode as PlayMode)) {
    throw new HttpError(400, 'bad_mode');
  }
  if (!Array.isArray(rounds) || rounds.length === 0 || rounds.length > MAX_EXPEDITION_ROUNDS) {
    throw new HttpError(400, 'bad_rounds');
  }
  const parsed: PlayRound[] = rounds.map((r) => {
    if (
      !isObject(r) ||
      typeof r.promptId !== 'string' ||
      !Array.isArray(r.attempts) ||
      r.attempts.length > MAX_ATTEMPTS_PER_ROUND ||
      !r.attempts.every((a) => typeof a === 'string' && a.length <= MAX_RAW_INPUT)
    ) {
      throw new HttpError(400, 'bad_rounds');
    }
    return { promptId: r.promptId, attempts: r.attempts as string[] };
  });
  return { date, mode: mode as PlayMode, rounds: parsed };
}

function logStatements(
  db: D1Database,
  logs: readonly LoggedAttempt[],
  date: string,
  mode: PlayMode,
  hash: string,
  now: Date,
): D1PreparedStatement[] {
  const insert = db.prepare(
    `INSERT INTO answer_logs (prompt_id, play_date, mode, input_norm, outcome, answer_id, device_hash, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  return logs
    .slice(0, MAX_LOGGED)
    .map((l) =>
      insert.bind(
        l.promptId,
        date,
        mode,
        l.inputNorm.slice(0, MAX_INPUT_LENGTH),
        l.outcome,
        l.answerId,
        hash,
        sqlTime(now),
      ),
    );
}

/** POST /api/v1/plays — sent once at the end of a session (docs/05-teknis.md §10.3). */
export async function postPlay(
  request: Request,
  env: Env,
  content: WorkerContent,
  today: string,
  now: Date,
): Promise<Response> {
  const device = requireDevice(request);
  const play = parsePlay(await readJsonBody(request));
  // Today, or yesterday for a session that was started before midnight.
  if (play.date !== today && play.date !== addDays(today, -1)) {
    throw new HttpError(400, 'bad_date');
  }
  const hash = await deviceHash(env.DB, play.date, device);
  const todayHash = play.date === today ? hash : await deviceHash(env.DB, today, device);
  await rateLimit(env.DB, todayHash, today, 'plays', MAX_PLAYS_PER_DAY);

  if (play.mode !== 'daily') {
    // Ekspedisi / Paket: logged for the editors' review queue, never scored on a leaderboard.
    const bank = bankIndex(content);
    const logs: LoggedAttempt[] = [];
    const tiers: Outcome[] = [];
    let points = 0;
    for (const round of play.rounds) {
      const prompt = bank.get(round.promptId);
      if (!prompt) continue;
      const r = scoreRound(prompt, round.attempts);
      logs.push(...r.logs);
      tiers.push(r.outcome);
      points += pointsFor(r.outcome);
    }
    const stmts = logStatements(env.DB, logs, play.date, play.mode, hash, now);
    if (stmts.length > 0) await env.DB.batch(stmts);
    return json(200, { altitude: altitude(points), tiers });
  }

  const payload = await frozenPayload(env.DB, content, play.date);
  if (!payload) throw new HttpError(404, 'not_published');
  let scored;
  try {
    scored = scoreDaily(payload.prompts, play.rounds);
  } catch {
    throw new HttpError(400, 'rounds_mismatch');
  }
  const member = await memberId(env.DEVICE_SECRET, device);

  // One score per member per date: a second submission is rejected and not logged again.
  const insert = await env.DB.prepare(
    `INSERT INTO daily_scores (member_id, play_date, altitude, tiers) VALUES (?, ?, ?, ?)
     ON CONFLICT (member_id, play_date) DO NOTHING`,
  )
    .bind(member, play.date, scored.response.altitude, scored.response.tiers.join(','))
    .run();
  if (insert.meta.changes === 0) {
    const existing = await env.DB.prepare(
      'SELECT altitude, tiers FROM daily_scores WHERE member_id = ? AND play_date = ?',
    )
      .bind(member, play.date)
      .first<{ altitude: number; tiers: string }>();
    return json(409, {
      error: 'already_played',
      altitude: existing?.altitude ?? 0,
      tiers: existing?.tiers.split(',') ?? [],
    });
  }

  await env.DB.batch([
    ...logStatements(env.DB, scored.logs, play.date, 'daily', hash, now),
    env.DB.prepare(
      `UPDATE groups SET last_active_at = ?
       WHERE code IN (SELECT group_code FROM group_members WHERE member_id = ?)`,
    ).bind(sqlTime(now), member),
  ]);
  return json(200, scored.response);
}
