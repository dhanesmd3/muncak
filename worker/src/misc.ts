import {
  MAX_INPUT_LENGTH,
  MAX_SUGGESTIONS_PER_DAY,
  MIN_ANSWER_LENGTH,
} from '../../src/game/constants';
import { normalize } from '../../src/game/normalize';
import { findPrompt } from './content';
import type { Env, WorkerContent } from './env';
import { HttpError, isObject, json, readJsonBody, sqlTime } from './http';
import { deviceHash, rateLimit, requireDevice } from './identity';

/** POST /api/v1/suggestions { promptId, input } — "Usulkan jawaban ini". Stored without any id. */
export async function postSuggestion(
  request: Request,
  env: Env,
  content: WorkerContent,
  today: string,
  now: Date,
): Promise<Response> {
  const device = requireDevice(request);
  const body = await readJsonBody(request);
  if (!isObject(body) || typeof body.promptId !== 'string' || typeof body.input !== 'string') {
    throw new HttpError(400, 'bad_request');
  }
  const prompt = findPrompt(content, body.promptId);
  if (!prompt) throw new HttpError(404, 'unknown_prompt');
  const input = normalize(body.input.slice(0, MAX_INPUT_LENGTH), prompt.optionalPrefixes);
  if (input.length < MIN_ANSWER_LENGTH) throw new HttpError(400, 'too_short');
  await rateLimit(
    env.DB,
    await deviceHash(env.DB, today, device),
    today,
    'suggestions',
    MAX_SUGGESTIONS_PER_DAY,
  );
  await env.DB.prepare(
    'INSERT INTO suggestions (prompt_id, input_norm, created_at) VALUES (?, ?, ?)',
  )
    .bind(prompt.id, input, sqlTime(now))
    .run();
  return json(201, { ok: true });
}

export const EVENT_NAMES = [
  'session_started',
  'session_finished',
  'share_pressed',
  'group_created',
] as const;

/** POST /api/v1/events { name } — aggregate daily count, no id (docs/05-teknis.md §12). */
export async function postEvent(request: Request, env: Env, today: string): Promise<Response> {
  const body = await readJsonBody(request);
  const name = isObject(body) ? body.name : undefined;
  if (typeof name !== 'string' || !(EVENT_NAMES as readonly string[]).includes(name)) {
    throw new HttpError(400, 'bad_event');
  }
  await env.DB.prepare(
    `INSERT INTO event_counts (day, name, count) VALUES (?, ?, 1)
     ON CONFLICT (day, name) DO UPDATE SET count = count + 1`,
  )
    .bind(today, name)
    .run();
  return json(204, null);
}

const MAX_ERRORS_PER_DAY = 2000;

/** POST /api/v1/errors { message, version } — error message and app version only. */
export async function postError(request: Request, env: Env, now: Date): Promise<Response> {
  const body = await readJsonBody(request);
  if (!isObject(body) || typeof body.message !== 'string') throw new HttpError(400, 'bad_request');
  const version = typeof body.version === 'string' ? body.version.slice(0, 32) : 'unknown';
  const today = sqlTime(now).slice(0, 10);
  const count = await env.DB.prepare('SELECT COUNT(*) AS n FROM error_logs WHERE created_at >= ?')
    .bind(today)
    .first<{ n: number }>();
  if ((count?.n ?? 0) < MAX_ERRORS_PER_DAY) {
    await env.DB.prepare('INSERT INTO error_logs (message, version, created_at) VALUES (?, ?, ?)')
      .bind(body.message.slice(0, 500), version, sqlTime(now))
      .run();
  }
  return json(204, null);
}
