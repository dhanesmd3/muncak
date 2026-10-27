// Routes the browser's /api/v1 requests into the real Worker code, running in the test
// process on SQLite (FakeD1). Lets e2e cover client ↔ server without a deployed backend.
import type { BrowserContext } from '@playwright/test';
import { createWorker } from '../../worker/src/app';
import type { Env, WorkerContent } from '../../worker/src/env';
import { E2E_PAYLOAD_KEY } from '../../playwright.config';
import { FakeD1 } from '../support/fake-d1';
import { DAY, MORNING, bankPrompts, fixturePrompts } from './helpers';

export interface Backend {
  db: FakeD1;
  attach(context: BrowserContext, opts?: { failPlays?: () => boolean }): Promise<void>;
}

export function createBackend(): Backend {
  const db = new FakeD1();
  const env: Env = { DB: db, DEVICE_SECRET: 'e2e-secret', ADMIN_TOKEN: 'e2e-admin' };
  const content: WorkerContent = {
    version: 1,
    generatedAt: 'e2e',
    launchDate: '2026-11-20',
    payloadKey: E2E_PAYLOAD_KEY,
    days: { '2026-11-30': fixturePrompts(), [DAY]: fixturePrompts() },
    bank: bankPrompts(),
  };
  // The Worker's clock is fixed at 10:00 WIB; the browser clock starts there too.
  const worker = createWorker(content, { now: () => MORNING });

  return {
    db,
    async attach(context, opts = {}) {
      await context.route('**/api/v1/**', async (route) => {
        const req = route.request();
        if (opts.failPlays?.() && new URL(req.url()).pathname.endsWith('/plays')) {
          return route.abort('internetdisconnected');
        }
        const res = await worker.fetch(
          new Request(req.url(), {
            method: req.method(),
            headers: req.headers(),
            body: req.method() === 'GET' || req.method() === 'HEAD' ? undefined : req.postData(),
          }),
          env,
        );
        const headers: Record<string, string> = {};
        res.headers.forEach((value, name) => (headers[name] = value));
        await route.fulfill({ status: res.status, headers, body: await res.text() });
      });
    },
  };
}
