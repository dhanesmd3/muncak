// Muncak API (docs/05-teknis.md §10). Content is passed in so tests can use fixtures.
import { todayWIB } from '../../src/game/date';
import { encodePayload } from '../../src/game/payload';
import { clearSuggestions, getRarityData } from './admin';
import { frozenPayload } from './content';
import { runDailyCron } from './cron';
import type { Env, ExecutionContextLike, ScheduledEventLike, WorkerContent } from './env';
import { createGroup, deleteMe, joinGroup, leaveGroup, viewGroup } from './groups';
import { HttpError, errorResponse, json } from './http';
import { postError, postEvent, postSuggestion } from './misc';
import { postPlay } from './plays';

export const API_PREFIX = '/api/v1';

export interface WorkerOptions {
  /** Clock and randomness, injectable for tests. */
  now?: () => Date;
  random?: () => number;
}

export function createWorker(content: WorkerContent, options: WorkerOptions = {}) {
  const clock = options.now ?? (() => new Date());
  const random = options.random ?? Math.random;

  async function route(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (!url.pathname.startsWith(`${API_PREFIX}/`)) throw new HttpError(404, 'not_found');
    const path = url.pathname.slice(API_PREFIX.length);
    const method = request.method;
    const now = clock();
    const today = todayWIB(now);

    if (path === '/daily' && method === 'GET') {
      const payload = await frozenPayload(env.DB, content, today);
      if (!payload) throw new HttpError(404, 'not_published');
      return new Response(encodePayload(payload, content.payloadKey), {
        headers: {
          'content-type': 'application/json; charset=utf-8',
          'cache-control': 'no-store',
          // Lets clients with a wrong clock use server time (docs/05-teknis.md §4).
          'x-server-time': String(now.getTime()),
        },
      });
    }
    if (path === '/plays' && method === 'POST') return postPlay(request, env, content, today, now);
    if (path === '/groups' && method === 'POST')
      return createGroup(request, env, today, now, random);
    if (path === '/me' && method === 'DELETE') return deleteMe(request, env);
    if (path === '/suggestions' && method === 'POST') {
      return postSuggestion(request, env, content, today, now);
    }
    if (path === '/events' && method === 'POST') return postEvent(request, env, today);
    if (path === '/errors' && method === 'POST') return postError(request, env, now);
    if (path === '/admin/rarity' && method === 'GET') return getRarityData(request, env);

    let m = /^\/groups\/([^/]+)$/.exec(path);
    if (m && method === 'GET') return viewGroup(request, env, decodeURIComponent(m[1]!), today);
    m = /^\/groups\/([^/]+)\/join$/.exec(path);
    if (m && method === 'POST')
      return joinGroup(request, env, decodeURIComponent(m[1]!), today, now);
    m = /^\/groups\/([^/]+)\/me$/.exec(path);
    if (m && method === 'DELETE') return leaveGroup(request, env, decodeURIComponent(m[1]!));
    m = /^\/admin\/suggestions\/([^/]+)$/.exec(path);
    if (m && method === 'DELETE') return clearSuggestions(request, env, decodeURIComponent(m[1]!));

    throw new HttpError(404, 'not_found');
  }

  return {
    async fetch(request: Request, env: Env): Promise<Response> {
      try {
        return await route(request, env);
      } catch (e) {
        if (e instanceof HttpError) return errorResponse(e);
        // Never log request headers or bodies: they carry the raw device id.
        console.error('muncak-api error:', (e as Error)?.message ?? String(e));
        return json(500, { error: 'internal' });
      }
    },

    async scheduled(event: ScheduledEventLike, env: Env, ctx: ExecutionContextLike): Promise<void> {
      ctx.waitUntil(runDailyCron(env, content, new Date(event.scheduledTime)));
    },
  };
}
