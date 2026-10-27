import { beforeEach, describe, expect, it } from 'vitest';
import fixture from '../../fixtures/daily-prompts.json';
import { MAX_PLAYS_PER_DAY } from '../../../src/game/constants';
import { parseDailyFile } from '../../../src/game/daily';
import type { GroupView } from '../../../src/game/groups';
import type { Prompt } from '../../../src/game/types';
import { createWorker } from '../../../worker/src/app';
import type { Env, WorkerContent } from '../../../worker/src/env';
import { FakeD1 } from '../../support/fake-d1';

const prompts = fixture as Prompt[];
const KEY = 'test-key';
const DAY = '2026-12-01';
// 10:00 WIB on DAY.
let nowMs = Date.parse('2026-12-01T03:00:00Z');
const setNow = (iso: string) => (nowMs = Date.parse(iso));

function content(days: Record<string, Prompt[]> = { '2026-11-30': prompts, [DAY]: prompts }) {
  return {
    version: 1,
    generatedAt: 'test',
    launchDate: '2026-11-20',
    payloadKey: KEY,
    days,
    bank: prompts.map((p) => ({ ...p, id: `bank-${p.id}`, pool: 'bank' as const })),
  } satisfies WorkerContent;
}

let db: FakeD1;
let env: Env;
let worker: ReturnType<typeof createWorker>;
let seq = 0;

beforeEach(() => {
  setNow('2026-12-01T03:00:00Z');
  db = new FakeD1();
  env = { DB: db, DEVICE_SECRET: 'secret-for-tests', ADMIN_TOKEN: 'admin-token' };
  seq = 0;
  worker = createWorker(content(), {
    now: () => new Date(nowMs),
    random: () => (seq++ * 0.137) % 1,
  });
});

interface Opts {
  method?: string;
  body?: unknown;
  device?: string;
  headers?: Record<string, string>;
}
async function call(path: string, opts: Opts = {}, w = worker) {
  const headers: Record<string, string> = { ...opts.headers };
  if (opts.device) headers['x-muncak-device'] = opts.device;
  if (opts.body !== undefined) headers['content-type'] = 'application/json';
  const res = await w.fetch(
    new Request(`https://muncak.test/api/v1${path}`, {
      method: opts.method ?? (opts.body !== undefined ? 'POST' : 'GET'),
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    }),
    env,
  );
  const text = await res.text();
  return { status: res.status, headers: res.headers, text, json: text ? JSON.parse(text) : null };
}

const DEV_A = 'device-aaaaaaaa-0001';
const DEV_B = 'device-bbbbbbbb-0002';
const DEV_C = 'device-cccccccc-0003';

/** A day where each round gets `answers[i]` (or times out when null). */
function dailyBody(answers: (string | null)[], date = DAY, extra: string[][] = []) {
  return {
    date,
    mode: 'daily',
    rounds: prompts.map((p, i) => ({
      promptId: p.id,
      attempts: [...(extra[i] ?? []), ...(answers[i] ? [answers[i]!] : [])],
    })),
  };
}
const ALL_BASECAMP = ['merah', 'senin', 'bumi', 'pensil', 'kucing', 'pisang', 'gitar'];

describe('GET /daily', () => {
  it('serves today with the day number and server time', async () => {
    const r = await call('/daily');
    expect(r.status).toBe(200);
    expect(r.headers.get('x-server-time')).toBe(String(nowMs));
    const payload = parseDailyFile(r.text, KEY, DAY);
    expect(payload.dayNumber).toBe(12);
    expect(payload.prompts.map((p) => p.id)).toEqual(prompts.map((p) => p.id));
  });

  it('404s when today is not published', async () => {
    setNow('2026-12-02T03:00:00Z');
    const r = await call('/daily');
    expect(r.status).toBe(404);
    expect(r.json).toEqual({ error: 'not_published' });
  });

  it('freezes tiers for the day, even after a redeploy with new rarity', async () => {
    await call('/daily');
    const retiered = prompts.map((p, i) =>
      i === 0
        ? {
            ...p,
            answers: p.answers.map((a) =>
              a.id === 'merah' ? { ...a, tier: 'summit' as const } : a,
            ),
          }
        : p,
    );
    const redeployed = createWorker(content({ [DAY]: retiered, '2026-12-02': retiered }), {
      now: () => new Date(nowMs),
    });
    const same = parseDailyFile((await call('/daily', {}, redeployed)).text, KEY, DAY);
    expect(same.prompts[0]!.answers.find((a) => a.id === 'merah')!.tier).toBe('basecamp');

    setNow('2026-12-02T03:00:00Z');
    const next = parseDailyFile((await call('/daily', {}, redeployed)).text, KEY, '2026-12-02');
    expect(next.prompts[0]!.answers.find((a) => a.id === 'merah')!.tier).toBe('summit');
  });
});

describe('POST /plays (daily)', () => {
  it('re-scores on the server', async () => {
    const answers = ['nila', 'senin', null, 'pensil', 'trenggiling', 'cempedak', 'gitar'];
    const r = await call('/plays', {
      device: DEV_A,
      body: dailyBody(answers, DAY, [['hitam', 'coklat'], [], ['pluto']]),
    });
    expect(r.status).toBe(200);
    // 100 + 10 + 0 + 10 + 100 + 100 + 10 = 330 points
    expect(r.json).toEqual({
      altitude: 2310,
      tiers: ['edelweiss', 'basecamp', 'fog', 'basecamp', 'edelweiss', 'edelweiss', 'basecamp'],
    });
    const logs = db.rows<{ outcome: string; input_norm: string }>(
      'SELECT outcome, input_norm FROM answer_logs ORDER BY id',
    );
    expect(logs.map((l) => `${l.outcome}:${l.input_norm}`).slice(0, 4)).toEqual([
      'rejected:hitam',
      'unknown:coklat',
      'accepted:nila',
      'accepted:senin',
    ]);
  });

  it('accepts only one score per member and day', async () => {
    await call('/plays', { device: DEV_A, body: dailyBody(ALL_BASECAMP) });
    const again = await call('/plays', { device: DEV_A, body: dailyBody(Array(7).fill('nila')) });
    expect(again.status).toBe(409);
    expect(again.json.altitude).toBe(490);
    expect(db.rows('SELECT * FROM daily_scores')).toHaveLength(1);
    expect(db.rows("SELECT * FROM answer_logs WHERE input_norm = 'nila'")).toHaveLength(0);
  });

  it('allows yesterday (a session across midnight) but not older days', async () => {
    expect(
      (await call('/plays', { device: DEV_A, body: dailyBody(ALL_BASECAMP, '2026-11-30') })).status,
    ).toBe(200);
    expect(
      (await call('/plays', { device: DEV_A, body: dailyBody(ALL_BASECAMP, '2026-11-29') })).status,
    ).toBe(400);
  });

  it('rejects rounds that do not match the day', async () => {
    const body = dailyBody(ALL_BASECAMP);
    body.rounds.reverse();
    expect((await call('/plays', { device: DEV_A, body })).json).toEqual({
      error: 'rounds_mismatch',
    });
    expect(
      (await call('/plays', { device: DEV_A, body: { ...body, rounds: body.rounds.slice(1) } }))
        .status,
    ).toBe(400);
  });

  it('needs a device id and a well-formed body', async () => {
    expect((await call('/plays', { body: dailyBody(ALL_BASECAMP) })).json).toEqual({
      error: 'device_required',
    });
    expect((await call('/plays', { device: DEV_A, body: { date: DAY } })).status).toBe(400);
    const tooMany = dailyBody(ALL_BASECAMP, DAY, [Array(41).fill('x')]);
    expect((await call('/plays', { device: DEV_A, body: tooMany })).status).toBe(400);
  });

  it('rate limits plays per device and day', async () => {
    const exp = {
      date: DAY,
      mode: 'expedition',
      rounds: [{ promptId: 'bank-fixture-pelangi-001', attempts: ['merah'] }],
    };
    for (let i = 0; i < MAX_PLAYS_PER_DAY; i++) {
      expect((await call('/plays', { device: DEV_A, body: exp })).status).toBe(200);
    }
    expect((await call('/plays', { device: DEV_A, body: exp })).status).toBe(429);
    expect((await call('/plays', { device: DEV_B, body: exp })).status).toBe(200);
  });

  it('never stores the raw device id', async () => {
    await call('/plays', { device: DEV_A, body: dailyBody(ALL_BASECAMP) });
    await call('/groups', { device: DEV_A, body: { name: 'Anak IF 2024', nickname: 'Rina' } });
    await call('/suggestions', {
      device: DEV_A,
      body: { promptId: prompts[0]!.id, input: 'magenta' },
    });
    const tables = db.rows<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'table'");
    for (const { name } of tables) {
      const dump = JSON.stringify(db.rows(`SELECT * FROM ${name}`));
      expect(dump, name).not.toContain(DEV_A);
    }
  });
});

describe('POST /plays (expedition / pack)', () => {
  it('logs bank prompts with their mode and ignores unknown prompts', async () => {
    const r = await call('/plays', {
      device: DEV_A,
      body: {
        date: DAY,
        mode: 'expedition',
        rounds: [
          { promptId: 'bank-fixture-pelangi-001', attempts: ['hitam', 'nila'] },
          { promptId: 'nope', attempts: ['x'] },
        ],
      },
    });
    expect(r.json).toEqual({ altitude: 700, tiers: ['edelweiss'] });
    expect(db.rows<{ mode: string }>('SELECT DISTINCT mode FROM answer_logs')).toEqual([
      { mode: 'expedition' },
    ]);
    expect(db.rows('SELECT * FROM daily_scores')).toHaveLength(0);
  });
});

describe('Rombongan', () => {
  async function create(device = DEV_A, name = 'Anak IF 2024', nickname = 'Rina') {
    return call('/groups', { device, body: { name, nickname } });
  }
  const view = async (code: string, device?: string, date?: string) =>
    (await call(`/groups/${code}${date ? `?date=${date}` : ''}`, { device })).json as GroupView;

  it('creates a group with an MCK code', async () => {
    const r = await create();
    expect(r.status).toBe(201);
    expect(r.json.code).toMatch(/^MCK-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}$/);
    expect(r.json.name).toBe('Anak IF 2024');
  });

  it('validates names (length, empty, rude words)', async () => {
    expect((await create(DEV_A, 'x'.repeat(21))).json).toEqual({ error: 'invalid_name' });
    expect((await create(DEV_A, 'Kelas', '   ')).json).toEqual({ error: 'invalid_name' });
    expect((await create(DEV_A, 'Kelas', 'B4ngs4t')).json).toEqual({ error: 'bad_name' });
    expect((await create(DEV_A, 'anjiiing', 'Rina')).json).toEqual({ error: 'bad_name' });
    expect((await create(DEV_A, 'Kelas Tasikmalaya', 'Rina')).status).toBe(201);
  });

  it('shows visitors only the name and size', async () => {
    const { code } = (await create()).json;
    const v = await view(code, DEV_B);
    expect(v).toMatchObject({ isMember: false, memberCount: 1, members: [], name: 'Anak IF 2024' });
    expect((await call('/groups/MCK-ZZZZ')).status).toBe(404);
  });

  it('hides scores until you have played (no spoilers)', async () => {
    const { code } = (await create()).json;
    await call(`/groups/${code}/join`, { device: DEV_B, body: { nickname: 'Dodi' } });
    await call('/plays', { device: DEV_A, body: dailyBody(['nila', ...ALL_BASECAMP.slice(1)]) });

    const before = await view(code, DEV_B);
    expect(before.revealed).toBe(false);
    expect(before.members.find((m) => m.nickname === 'Rina')!.today).toBeNull();
    expect(before.members.find((m) => m.nickname === 'Rina')!.week).toBe(0);
    expect(before.edelweissFinders).toEqual([]);

    await call('/plays', { device: DEV_B, body: dailyBody(ALL_BASECAMP) });
    const after = await view(code, DEV_B);
    expect(after.revealed).toBe(true);
    expect(after.members.map((m) => [m.nickname, m.today?.altitude, m.isMe])).toEqual([
      ['Rina', 1120, false],
      ['Dodi', 490, true],
    ]);
    expect(after.edelweissFinders).toEqual(['Rina']);
  });

  it('sums the week Monday–Sunday', async () => {
    // 2026-11-30 is a Monday.
    const { code } = (await create()).json;
    setNow('2026-11-30T03:00:00Z');
    await call('/plays', { device: DEV_A, body: dailyBody(ALL_BASECAMP, '2026-11-30') });
    setNow('2026-12-01T03:00:00Z');
    await call('/plays', { device: DEV_A, body: dailyBody(ALL_BASECAMP) });
    expect((await view(code, DEV_A)).members[0]!.week).toBe(980);
    expect((await view(code, DEV_A, '2026-11-30')).members[0]!.week).toBe(490);
  });

  it('enforces 50 members per group and 10 groups per player', async () => {
    const { code } = (await create()).json;
    for (let i = 2; i <= 50; i++) {
      const r = await call(`/groups/${code}/join`, {
        device: `member-device-${i}`,
        body: { nickname: `M${i}` },
      });
      expect(r.status).toBe(200);
    }
    expect(
      (await call(`/groups/${code}/join`, { device: 'member-device-51', body: { nickname: 'X' } }))
        .json,
    ).toEqual({ error: 'group_full' });

    for (let i = 0; i < 4; i++) await create(DEV_C, `G${i}`, 'Dodi'); // create limit is 5/day
    setNow('2026-12-02T03:00:00Z');
    for (let i = 4; i < 9; i++) await create(DEV_C, `G${i}`, 'Dodi');
    setNow('2026-12-03T03:00:00Z');
    expect((await create(DEV_C, 'G9', 'Dodi')).status).toBe(201);
    expect((await create(DEV_C, 'G10', 'Dodi')).json).toEqual({ error: 'too_many_groups' });
  });

  it('rejoining updates the nickname instead of adding a member', async () => {
    const { code } = (await create()).json;
    await call(`/groups/${code}/join`, { device: DEV_A, body: { nickname: 'Rina K' } });
    const v = await view(code, DEV_A);
    expect(v.members.map((m) => m.nickname)).toEqual(['Rina K']);
  });

  it('leaving the last member deletes the group', async () => {
    const { code } = (await create()).json;
    expect((await call(`/groups/${code}/me`, { method: 'DELETE', device: DEV_A })).status).toBe(
      200,
    );
    expect((await call(`/groups/${code}`)).status).toBe(404);
  });

  it('DELETE /me removes memberships and scores', async () => {
    const { code } = (await create()).json;
    await call(`/groups/${code}/join`, { device: DEV_B, body: { nickname: 'Dodi' } });
    await call('/plays', { device: DEV_A, body: dailyBody(ALL_BASECAMP) });
    expect((await call('/me', { method: 'DELETE', device: DEV_A })).status).toBe(200);
    expect(db.rows('SELECT * FROM daily_scores')).toHaveLength(0);
    expect((await view(code, DEV_B)).members.map((m) => m.nickname)).toEqual(['Dodi']);
    // Anonymous answer logs stay.
    expect(db.rows('SELECT * FROM answer_logs').length).toBeGreaterThan(0);
  });
});

describe('suggestions, events, errors', () => {
  it('stores a normalized suggestion without any id', async () => {
    const r = await call('/suggestions', {
      device: DEV_A,
      body: { promptId: prompts[0]!.id, input: 'Warna Magénta' },
    });
    expect(r.status).toBe(201);
    expect(db.rows('SELECT prompt_id, input_norm FROM suggestions')).toEqual([
      { prompt_id: prompts[0]!.id, input_norm: 'magenta' },
    ]);
    expect(
      (await call('/suggestions', { device: DEV_A, body: { promptId: 'nope', input: 'abc' } }))
        .status,
    ).toBe(404);
  });

  it('counts whitelisted events per day', async () => {
    expect((await call('/events', { body: { name: 'share_pressed' } })).status).toBe(204);
    await call('/events', { body: { name: 'share_pressed' } });
    expect((await call('/events', { body: { name: 'hack' } })).status).toBe(400);
    expect(db.rows('SELECT day, name, count FROM event_counts')).toEqual([
      { day: DAY, name: 'share_pressed', count: 2 },
    ]);
  });

  it('stores error message and version only', async () => {
    expect(
      (
        await call('/errors', {
          body: { message: 'x'.repeat(900), version: '0.1.0', stack: 'secret' },
        })
      ).status,
    ).toBe(204);
    const [row] = db.rows<{ message: string; version: string }>(
      'SELECT message, version FROM error_logs',
    );
    expect(row!.message).toHaveLength(500);
    expect(row!.version).toBe('0.1.0');
  });
});

describe('admin', () => {
  const admin = { headers: { authorization: 'Bearer admin-token' } };

  it('is hidden without a token and refuses a wrong one', async () => {
    expect(
      (await call('/admin/rarity', { headers: { authorization: 'Bearer nope' } })).status,
    ).toBe(401);
    env.ADMIN_TOKEN = undefined;
    expect((await call('/admin/rarity', admin)).status).toBe(404);
  });

  it('returns accepted counts and unknown answers seen on ≥ 3 devices', async () => {
    const unknownTwice = dailyBody(ALL_BASECAMP, DAY, [['magenta']]);
    await call('/plays', { device: DEV_A, body: unknownTwice });
    await call('/plays', { device: DEV_B, body: unknownTwice });
    const r1 = (await call('/admin/rarity', admin)).json;
    expect(r1.prompts[prompts[0]!.id]).toEqual({ rounds: 2, counts: { merah: 2 } });
    expect(r1.unknown).toEqual({});

    await call('/plays', { device: DEV_C, body: unknownTwice });
    const r2 = (await call('/admin/rarity', admin)).json;
    expect(r2.unknown[prompts[0]!.id]).toEqual([{ input: 'magenta', count: 3, devices: 3 }]);
  });

  it('lists and clears suggestions', async () => {
    await call('/suggestions', {
      device: DEV_A,
      body: { promptId: prompts[0]!.id, input: 'magenta' },
    });
    await call('/suggestions', {
      device: DEV_B,
      body: { promptId: prompts[0]!.id, input: 'magenta' },
    });
    expect((await call('/admin/rarity', admin)).json.suggestions).toEqual({
      [prompts[0]!.id]: [{ input: 'magenta', count: 2 }],
    });
    const del = await call(`/admin/suggestions/${prompts[0]!.id}`, { ...admin, method: 'DELETE' });
    expect(del.json).toEqual({ deleted: 2 });
  });
});

describe('daily cron (00:00 WIB)', () => {
  const runCron = async (iso: string) => {
    let done: Promise<unknown> = Promise.resolve();
    await worker.scheduled({ scheduledTime: Date.parse(iso) }, env, {
      waitUntil: (p) => (done = p),
    });
    await done;
  };

  it("creates today's salt, freezes tiers and drops salts older than 2 days", async () => {
    db.raw.exec(
      "INSERT INTO daily_salts VALUES ('2026-11-28', 'a'), ('2026-11-29', 'b'), ('2026-11-30', 'c')",
    );
    await runCron('2026-11-30T17:00:00Z'); // 00:00 WIB on 1 Dec
    expect(
      db
        .rows<{ play_date: string }>('SELECT play_date FROM daily_salts ORDER BY 1')
        .map((r) => r.play_date),
    ).toEqual(['2026-11-30', DAY]);
    expect(db.rows('SELECT play_date FROM tier_snapshots')).toEqual([{ play_date: DAY }]);
  });

  it('deletes groups inactive for 90 days and aggregates logs older than 24 months', async () => {
    db.raw
      .exec(`INSERT INTO groups VALUES ('MCK-OLD2', 'Lama', '2026-01-01 00:00:00', '2026-08-01 00:00:00'),
                                          ('MCK-NEW2', 'Baru', '2026-01-01 00:00:00', '2026-11-01 00:00:00')`);
    db.raw.exec(`INSERT INTO group_members VALUES ('MCK-OLD2', 'm1', 'A', '2026-01-01 00:00:00'),
                                                 ('MCK-NEW2', 'm2', 'B', '2026-11-01 00:00:00')`);
    db.raw
      .exec(`INSERT INTO answer_logs (prompt_id, play_date, mode, input_norm, outcome, answer_id, device_hash, created_at)
                 VALUES ('p', '2024-01-01', 'daily', 'merah', 'accepted', 'merah', 'h1', '2024-01-01 00:00:00'),
                        ('p', '2024-01-02', 'daily', 'merah', 'accepted', 'merah', 'h2', '2024-01-02 00:00:00'),
                        ('p', '2026-11-30', 'daily', 'merah', 'accepted', 'merah', 'h3', '2026-11-30 00:00:00')`);
    await runCron('2026-11-30T17:00:00Z');
    expect(db.rows<{ code: string }>('SELECT code FROM groups').map((g) => g.code)).toEqual([
      'MCK-NEW2',
    ]);
    expect(db.rows('SELECT * FROM answer_logs')).toHaveLength(1);
    expect(db.rows('SELECT prompt_id, input_norm, count FROM answer_aggregates')).toEqual([
      { prompt_id: 'p', input_norm: 'merah', count: 2 },
    ]);
    // Aggregates still count towards rarity.
    const r = (await call('/admin/rarity', { headers: { authorization: 'Bearer admin-token' } }))
      .json;
    expect(r.prompts.p).toEqual({ rounds: 3, counts: { merah: 3 } });
  });
});
