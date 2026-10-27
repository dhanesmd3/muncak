// Backend client (phase 2). Everything here is a no-op when VITE_API_BASE is not set, so the
// game keeps working as a fully static site (phase 1).
import { CLOCK_SKEW_TOLERANCE_MS } from '../game/constants';
import type { GroupView } from '../game/groups';
import type { PlayRequest, PlayResponse } from '../game/play';
import { deviceId } from '../storage/device';

const RAW_BASE = String(import.meta.env.VITE_API_BASE ?? '').replace(/\/$/, '');
// Only a same-origin path ("/api/v1") or an http(s) URL is valid. Anything else (e.g. a
// path rewritten by Git Bash into "C:/Program Files/Git/api/v1") would break every request.
const VALID_BASE = /^(\/|https?:\/\/)/.test(RAW_BASE);
if (RAW_BASE && !VALID_BASE) {
  console.warn(`VITE_API_BASE "${RAW_BASE}" is not a path or URL; backend disabled.`);
}
const BASE = VALID_BASE ? RAW_BASE : '';
export const API_ENABLED = BASE !== '';
export const APP_VERSION = import.meta.env.VITE_APP_VERSION ?? 'dev';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly body: unknown = null,
  ) {
    super(code);
  }
}

// ── Server clock (docs/05-teknis.md §4) ────────────────────────────────────────────
let clockOffset = 0;

/** Remember the server's clock; only used when the device is off by more than 5 minutes. */
function noteServerTime(res: Response): void {
  const header = res.headers.get('x-server-time');
  const server = header ? Number(header) : Date.parse(res.headers.get('date') ?? '');
  if (!Number.isFinite(server)) return;
  const offset = server - Date.now();
  clockOffset = Math.abs(offset) > CLOCK_SKEW_TOLERANCE_MS ? offset : 0;
}

/** "Now" for deciding the WIB date. */
export function appNow(): Date {
  return new Date(Date.now() + clockOffset);
}

// ── Requests ───────────────────────────────────────────────────────────────────────
interface Options {
  method?: string;
  body?: unknown;
  /** Send the device id (never for events or errors, which must stay anonymous). */
  device?: boolean;
}

async function request(path: string, opts: Options = {}): Promise<Response> {
  const headers: Record<string, string> = {};
  if (opts.body !== undefined) headers['content-type'] = 'application/json';
  if (opts.device) {
    const id = deviceId();
    if (id) headers['x-muncak-device'] = id;
  }
  const res = await fetch(`${BASE}${path}`, {
    method: opts.method ?? (opts.body !== undefined ? 'POST' : 'GET'),
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    cache: 'no-store',
  });
  noteServerTime(res);
  return res;
}

async function requestJson<T>(path: string, opts: Options = {}): Promise<T> {
  const res = await request(path, opts);
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    // not JSON (e.g. an HTML error page)
  }
  if (!res.ok) {
    const code = (body as { error?: string } | null)?.error ?? `http_${res.status}`;
    throw new ApiError(res.status, code, body);
  }
  return body as T;
}

export const api = {
  /** The daily payload file as text, or null when today is not published yet. */
  async daily(): Promise<string | null> {
    const res = await request('/daily');
    if (res.status === 404) return null;
    if (!res.ok) throw new ApiError(res.status, `http_${res.status}`);
    return res.text();
  },

  postPlay: (play: PlayRequest) =>
    requestJson<PlayResponse>('/plays', { body: play, device: true }),

  createGroup: (name: string, nickname: string) =>
    requestJson<{ code: string; name: string }>('/groups', {
      body: { name, nickname },
      device: true,
    }),

  joinGroup: (code: string, nickname: string) =>
    requestJson<{ code: string; name: string }>(`/groups/${encodeURIComponent(code)}/join`, {
      body: { nickname },
      device: true,
    }),

  group: (code: string, date?: string) =>
    requestJson<GroupView>(
      `/groups/${encodeURIComponent(code)}${date ? `?date=${encodeURIComponent(date)}` : ''}`,
      { device: true },
    ),

  leaveGroup: (code: string) =>
    requestJson<{ left: boolean }>(`/groups/${encodeURIComponent(code)}/me`, {
      method: 'DELETE',
      device: true,
    }),

  deleteMe: () => requestJson<{ deleted: boolean }>('/me', { method: 'DELETE', device: true }),

  suggest: (promptId: string, input: string) =>
    requestJson<{ ok: boolean }>('/suggestions', { body: { promptId, input }, device: true }),
};

export type EventName = 'session_started' | 'session_finished' | 'share_pressed' | 'group_created';

/** Aggregate usage counter, without any id. Fire and forget. */
export function trackEvent(name: EventName): void {
  if (!API_ENABLED) return;
  void request('/events', { body: { name } }).catch(() => undefined);
}

let errorsSent = 0;
/** Report an app error (message and version only). At most 5 per session. */
export function reportError(message: string): void {
  if (!API_ENABLED || errorsSent >= 5) return;
  errorsSent++;
  void request('/errors', { body: { message: message.slice(0, 500), version: APP_VERSION } }).catch(
    () => undefined,
  );
}
