// Rombongan (docs/02-game-design.md §5.3, docs/05-teknis.md §10.3).
import {
  GROUP_MAX_MEMBERS,
  GROUP_MAX_PER_PLAYER,
  MAX_GROUP_CREATES_PER_DAY,
  MAX_GROUP_JOINS_PER_DAY,
} from '../../src/game/constants';
import { isValidDate, mondayOf } from '../../src/game/date';
import {
  CODE_PATTERN,
  cleanName,
  makeGroupCode,
  type GroupMemberView,
  type GroupView,
} from '../../src/game/groups';
import type { Outcome } from '../../src/game/types';
import { isBadName } from './badwords';
import type { D1Database, Env } from './env';
import { HttpError, isObject, json, readJsonBody, sqlTime } from './http';
import { deviceHash, deviceIdOf, memberId, rateLimit, requireDevice } from './identity';

function validName(value: unknown): string {
  const name = cleanName(value);
  if (!name) throw new HttpError(400, 'invalid_name');
  if (isBadName(name)) throw new HttpError(400, 'bad_name');
  return name;
}

async function groupsOfMember(db: D1Database, member: string): Promise<number> {
  const row = await db
    .prepare('SELECT COUNT(*) AS n FROM group_members WHERE member_id = ?')
    .bind(member)
    .first<{ n: number }>();
  return row?.n ?? 0;
}

async function getGroup(db: D1Database, code: string) {
  if (!CODE_PATTERN.test(code)) throw new HttpError(404, 'group_not_found');
  const g = await db
    .prepare('SELECT code, name FROM groups WHERE code = ?')
    .bind(code)
    .first<{ code: string; name: string }>();
  if (!g) throw new HttpError(404, 'group_not_found');
  return g;
}

/** Remove groups that no longer have members. */
export function deleteEmptyGroups(db: D1Database) {
  return db.prepare('DELETE FROM groups WHERE code NOT IN (SELECT group_code FROM group_members)');
}

/** POST /api/v1/groups { name, nickname } → { code, name } */
export async function createGroup(
  request: Request,
  env: Env,
  today: string,
  now: Date,
  random: () => number,
): Promise<Response> {
  const device = requireDevice(request);
  const body = await readJsonBody(request);
  if (!isObject(body)) throw new HttpError(400, 'bad_request');
  const name = validName(body.name);
  const nickname = validName(body.nickname);
  await rateLimit(
    env.DB,
    await deviceHash(env.DB, today, device),
    today,
    'group_create',
    MAX_GROUP_CREATES_PER_DAY,
  );
  const member = await memberId(env.DEVICE_SECRET, device);
  if ((await groupsOfMember(env.DB, member)) >= GROUP_MAX_PER_PLAYER) {
    throw new HttpError(409, 'too_many_groups');
  }

  const ts = sqlTime(now);
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = makeGroupCode(random);
    const res = await env.DB.prepare(
      `INSERT INTO groups (code, name, created_at, last_active_at) VALUES (?, ?, ?, ?)
       ON CONFLICT (code) DO NOTHING`,
    )
      .bind(code, name, ts, ts)
      .run();
    if (res.meta.changes === 0) continue; // code taken, try another
    await env.DB.prepare(
      'INSERT INTO group_members (group_code, member_id, nickname, joined_at) VALUES (?, ?, ?, ?)',
    )
      .bind(code, member, nickname, ts)
      .run();
    return json(201, { code, name });
  }
  throw new HttpError(503, 'no_code_available');
}

/** POST /api/v1/groups/:code/join { nickname } */
export async function joinGroup(
  request: Request,
  env: Env,
  code: string,
  today: string,
  now: Date,
): Promise<Response> {
  const device = requireDevice(request);
  const body = await readJsonBody(request);
  if (!isObject(body)) throw new HttpError(400, 'bad_request');
  const nickname = validName(body.nickname);
  const group = await getGroup(env.DB, code);
  await rateLimit(
    env.DB,
    await deviceHash(env.DB, today, device),
    today,
    'group_join',
    MAX_GROUP_JOINS_PER_DAY,
  );
  const member = await memberId(env.DEVICE_SECRET, device);
  const ts = sqlTime(now);

  const already = await env.DB.prepare(
    'SELECT 1 AS x FROM group_members WHERE group_code = ? AND member_id = ?',
  )
    .bind(code, member)
    .first();
  if (already) {
    await env.DB.prepare(
      'UPDATE group_members SET nickname = ? WHERE group_code = ? AND member_id = ?',
    )
      .bind(nickname, code, member)
      .run();
    return json(200, { code, name: group.name });
  }

  const count = await env.DB.prepare('SELECT COUNT(*) AS n FROM group_members WHERE group_code = ?')
    .bind(code)
    .first<{ n: number }>();
  if ((count?.n ?? 0) >= GROUP_MAX_MEMBERS) throw new HttpError(409, 'group_full');
  if ((await groupsOfMember(env.DB, member)) >= GROUP_MAX_PER_PLAYER) {
    throw new HttpError(409, 'too_many_groups');
  }
  await env.DB.batch([
    env.DB.prepare(
      'INSERT INTO group_members (group_code, member_id, nickname, joined_at) VALUES (?, ?, ?, ?)',
    ).bind(code, member, nickname, ts),
    env.DB.prepare('UPDATE groups SET last_active_at = ? WHERE code = ?').bind(ts, code),
  ]);
  return json(200, { code, name: group.name });
}

interface MemberRow {
  member_id: string;
  nickname: string;
  altitude: number | null;
  tiers: string | null;
}

/**
 * GET /api/v1/groups/:code?date= — standings. Visitors only see the name and size. Other
 * members' scores for `date` are only sent once the requester has a score that day.
 */
export async function viewGroup(
  request: Request,
  env: Env,
  code: string,
  today: string,
): Promise<Response> {
  const url = new URL(request.url);
  const date = url.searchParams.get('date') ?? today;
  if (!isValidDate(date) || date > today) throw new HttpError(400, 'bad_date');
  const group = await getGroup(env.DB, code);
  const device = deviceIdOf(request);
  const me = device ? await memberId(env.DEVICE_SECRET, device) : null;

  const rows = (
    await env.DB.prepare(
      `SELECT gm.member_id, gm.nickname, ds.altitude, ds.tiers
       FROM group_members gm
       LEFT JOIN daily_scores ds ON ds.member_id = gm.member_id AND ds.play_date = ?
       WHERE gm.group_code = ?`,
    )
      .bind(date, code)
      .all<MemberRow>()
  ).results;

  const base: GroupView = {
    code: group.code,
    name: group.name,
    memberCount: rows.length,
    isMember: false,
    revealed: false,
    date,
    members: [],
    edelweissFinders: [],
  };
  const mine = rows.find((r) => r.member_id === me);
  if (!mine) return json(200, base);

  const revealed = mine.altitude !== null;
  const week = (
    await env.DB.prepare(
      `SELECT ds.member_id, SUM(ds.altitude) AS total
       FROM daily_scores ds JOIN group_members gm ON gm.member_id = ds.member_id
       WHERE gm.group_code = ? AND ds.play_date BETWEEN ? AND ?
       GROUP BY ds.member_id`,
    )
      .bind(code, mondayOf(date), date)
      .all<{ member_id: string; total: number }>()
  ).results;
  const weekOf = new Map(week.map((w) => [w.member_id, w.total]));

  const members: GroupMemberView[] = rows.map((r) => {
    const isMe = r.member_id === me;
    const visible = isMe || revealed;
    const score =
      r.altitude !== null
        ? { altitude: r.altitude, tiers: (r.tiers ?? '').split(',') as Outcome[] }
        : null;
    const total = weekOf.get(r.member_id) ?? 0;
    return {
      nickname: r.nickname,
      isMe,
      today: visible ? score : null,
      // Before you play, others' weekly totals leave out today's (hidden) score.
      week: visible ? total : total - (score?.altitude ?? 0),
    };
  });
  members.sort(
    (a, b) =>
      (b.today?.altitude ?? -1) - (a.today?.altitude ?? -1) ||
      b.week - a.week ||
      a.nickname.localeCompare(b.nickname),
  );

  return json(200, {
    ...base,
    isMember: true,
    revealed,
    members,
    edelweissFinders: revealed
      ? members.filter((m) => m.today?.tiers.includes('edelweiss')).map((m) => m.nickname)
      : [],
  } satisfies GroupView);
}

/** DELETE /api/v1/groups/:code/me — leave a group. */
export async function leaveGroup(request: Request, env: Env, code: string): Promise<Response> {
  const device = requireDevice(request);
  await getGroup(env.DB, code);
  const member = await memberId(env.DEVICE_SECRET, device);
  await env.DB.batch([
    env.DB.prepare('DELETE FROM group_members WHERE group_code = ? AND member_id = ?').bind(
      code,
      member,
    ),
    deleteEmptyGroups(env.DB),
  ]);
  return json(200, { left: true });
}

/** DELETE /api/v1/me — delete member, nicknames, scores and memberships. */
export async function deleteMe(request: Request, env: Env): Promise<Response> {
  const device = requireDevice(request);
  const member = await memberId(env.DEVICE_SECRET, device);
  await env.DB.batch([
    env.DB.prepare('DELETE FROM group_members WHERE member_id = ?').bind(member),
    env.DB.prepare('DELETE FROM daily_scores WHERE member_id = ?').bind(member),
    deleteEmptyGroups(env.DB),
  ]);
  return json(200, { deleted: true });
}
