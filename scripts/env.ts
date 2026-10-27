// Shared CLI and environment handling for the build scripts.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadEnv } from 'vite';
import { isValidDate } from '../src/game/date';
import { DEFAULT_PAYLOAD_KEY } from '../src/game/payload';
import type { Prompt } from '../src/game/types';

export const args = process.argv.slice(2);
export const useFixture = args.includes('--fixture');

/** `--now <ISO time>` pretends it is that moment (for testing the scripts). */
export function scriptNow(name: string): Date {
  const i = args.indexOf('--now');
  const now = i >= 0 && args[i + 1] ? new Date(args[i + 1]!) : new Date();
  if (Number.isNaN(now.getTime())) {
    console.error(`${name}: invalid --now value`);
    process.exit(1);
  }
  return now;
}

// Real environment variables win over .env files, as in Vite.
export const env = {
  ...loadEnv('production', process.cwd(), ['VITE_', 'MUNCAK_']),
  ...process.env,
};
export const payloadKey = env.VITE_PAYLOAD_KEY || DEFAULT_PAYLOAD_KEY;
export const launchDate = env.VITE_LAUNCH_DATE || undefined;
/** Set in phase 2: the daily payload then comes from the Worker, not from static files. */
export const apiBase = env.VITE_API_BASE || undefined;

export function checkLaunchDate(name: string): void {
  if (launchDate !== undefined && !isValidDate(launchDate)) {
    console.error(`${name}: VITE_LAUNCH_DATE "${launchDate}" must be YYYY-MM-DD`);
    process.exit(1);
  }
}

export function fixturePrompts(): Prompt[] {
  return JSON.parse(
    readFileSync(join('tests', 'fixtures', 'daily-prompts.json'), 'utf8'),
  ) as Prompt[];
}
