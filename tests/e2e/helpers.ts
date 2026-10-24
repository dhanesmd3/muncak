import { readFileSync } from 'node:fs';
import type { Page } from '@playwright/test';
import { encodePayload } from '../../src/game/payload';
import type { DailyPayload, Prompt } from '../../src/game/types';
import { E2E_PAYLOAD_KEY } from '../../playwright.config';

/** 10:00 WIB on 1 December 2026. */
export const DAY = '2026-12-01';
export const MORNING = new Date('2026-12-01T03:00:00Z');

const fixture = JSON.parse(readFileSync('tests/fixtures/daily-prompts.json', 'utf8')) as Prompt[];

export function fixturePayload(date = DAY, dayNumber = 1): DailyPayload {
  return { date, dayNumber, prompts: fixture };
}

/** Serve fixture payloads (never real content) for /daily/<date>.json. */
export async function mockDaily(page: Page, opts: { missing?: boolean } = {}): Promise<void> {
  await page.route('**/daily/*.json', async (route) => {
    const date = /daily\/(\d{4}-\d{2}-\d{2})\.json/.exec(route.request().url())?.[1] ?? '';
    if (opts.missing) return route.fulfill({ status: 404, body: 'not found' });
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: encodePayload(fixturePayload(date), E2E_PAYLOAD_KEY),
    });
  });
}

/** Capture what the app copies and stop share sheets / popups from opening. */
export async function stubShare(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const w = window as unknown as { __copied: string[] };
    w.__copied = [];
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: async (t: string) => void w.__copied.push(t) },
      configurable: true,
    });
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
    window.open = () => null;
  });
}

/** First play in a fresh browser: the onboarding appears, skip it. */
export async function startDaily(page: Page): Promise<void> {
  await page.getByRole('button', { name: /Muncak Harian/ }).click();
  await page.getByRole('button', { name: 'Lewati' }).click();
}

export async function answer(page: Page, text: string): Promise<void> {
  const input = page.getByLabel('Jawaban kamu');
  await input.fill(text);
  await input.press('Enter');
}

export async function next(page: Page): Promise<void> {
  // The reveal ignores clicks in its first 400 ms; let that pass.
  await page.clock.runFor(500);
  await page.getByRole('button', { name: /Lanjut|Lihat hasil/ }).click();
}
