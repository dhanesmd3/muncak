// Editor-only endpoints, used by scripts/compute-rarity.ts (docs/05-teknis.md §10.4).
// Protected by the ADMIN_TOKEN secret; disabled when it is not set.
import { UNKNOWN_MIN_DEVICES, UNKNOWN_REPORT_SIZE } from '../../src/game/constants';
import type { PromptCounts } from '../../src/game/rarity';
import type { Env } from './env';
import { HttpError, json } from './http';
import { safeEqual } from './identity';

export interface UnknownAnswer {
  input: string;
  count: number;
  devices: number;
}

export interface Suggestion {
  input: string;
  count: number;
}

export interface RarityData {
  prompts: Record<string, PromptCounts>;
  unknown: Record<string, UnknownAnswer[]>;
  suggestions: Record<string, Suggestion[]>;
}

export function requireAdmin(request: Request, env: Env): void {
  const token = env.ADMIN_TOKEN;
  if (!token) throw new HttpError(404, 'not_found');
  const auth = request.headers.get('authorization') ?? '';
  if (!safeEqual(auth, `Bearer ${token}`)) throw new HttpError(401, 'unauthorized');
}

/** GET /api/v1/admin/rarity — accepted counts per answer (daily only) and the review queue. */
export async function getRarityData(request: Request, env: Env): Promise<Response> {
  requireAdmin(request, env);
  const accepted = (
    await env.DB.prepare(
      `SELECT prompt_id, answer_id, COUNT(*) AS n FROM answer_logs
       WHERE mode = 'daily' AND outcome = 'accepted' GROUP BY prompt_id, answer_id
       UNION ALL
       SELECT prompt_id, answer_id, SUM(count) AS n FROM answer_aggregates
       WHERE mode = 'daily' AND outcome = 'accepted' GROUP BY prompt_id, answer_id`,
    ).all<{ prompt_id: string; answer_id: string; n: number }>()
  ).results;

  const prompts: Record<string, PromptCounts> = {};
  for (const r of accepted) {
    const p = (prompts[r.prompt_id] ??= { rounds: 0, counts: {} });
    p.rounds += r.n;
    p.counts[r.answer_id] = (p.counts[r.answer_id] ?? 0) + r.n;
  }

  // Only answers typed on at least UNKNOWN_MIN_DEVICES devices reach editors, so a single
  // player's personal data never shows up in the report (docs/07-privasi.md §3).
  const unknownRows = (
    await env.DB.prepare(
      `SELECT prompt_id, input_norm, COUNT(*) AS n, COUNT(DISTINCT device_hash) AS devices
       FROM answer_logs WHERE outcome = 'unknown'
       GROUP BY prompt_id, input_norm HAVING devices >= ?
       ORDER BY prompt_id, n DESC`,
    )
      .bind(UNKNOWN_MIN_DEVICES)
      .all<{ prompt_id: string; input_norm: string; n: number; devices: number }>()
  ).results;
  const unknown: Record<string, UnknownAnswer[]> = {};
  for (const r of unknownRows) {
    const list = (unknown[r.prompt_id] ??= []);
    if (list.length < UNKNOWN_REPORT_SIZE) {
      list.push({ input: r.input_norm, count: r.n, devices: r.devices });
    }
  }

  const suggestionRows = (
    await env.DB.prepare(
      `SELECT prompt_id, input_norm, COUNT(*) AS n FROM suggestions
       GROUP BY prompt_id, input_norm ORDER BY prompt_id, n DESC`,
    ).all<{ prompt_id: string; input_norm: string; n: number }>()
  ).results;
  const suggestions: Record<string, Suggestion[]> = {};
  for (const r of suggestionRows) {
    (suggestions[r.prompt_id] ??= []).push({ input: r.input_norm, count: r.n });
  }

  return json(200, { prompts, unknown, suggestions } satisfies RarityData);
}

/** DELETE /api/v1/admin/suggestions/:promptId — clear reviewed suggestions. */
export async function clearSuggestions(
  request: Request,
  env: Env,
  promptId: string,
): Promise<Response> {
  requireAdmin(request, env);
  const res = await env.DB.prepare('DELETE FROM suggestions WHERE prompt_id = ?')
    .bind(promptId)
    .run();
  return json(200, { deleted: res.meta.changes });
}
