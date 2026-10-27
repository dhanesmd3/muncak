// content → public/daily/<date>.json for today and tomorrow (WIB). docs/05-teknis.md §9.
//
//   tsx scripts/build-daily.ts             real schedule (used by `npm run build`)
//   tsx scripts/build-daily.ts --fixture   fake prompts from tests/fixtures (local play only)
//   --now <ISO time>                       pretend it is this moment (for testing the script)
//
// With VITE_API_BASE set (phase 2) no static daily files are written: the Worker serves
// today's payload and tomorrow's cannot be fetched (docs/05-teknis.md §10.3).
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROUNDS_PER_DAY } from '../src/game/constants';
import { dailyPath } from '../src/game/daily';
import { addDays, dayNumber, todayWIB } from '../src/game/date';
import { encodePayload } from '../src/game/payload';
import type { DailyPayload, Prompt } from '../src/game/types';
import { byDifficulty, loadContent, printReport, promptsForDate } from './content';
import {
  apiBase,
  checkLaunchDate,
  fixturePrompts,
  launchDate,
  payloadKey,
  scriptNow,
  useFixture,
} from './env';

const OUT_DIR = join('public', 'daily');
const today = todayWIB(scriptNow('build-daily'));
const dates = [today, addDays(today, 1)];

function payloadFor(date: string, prompts: Prompt[]): DailyPayload {
  // Fixture days count from today, so local play never shows "#-37".
  const number = useFixture ? dayNumber(date, today) : launchDate ? dayNumber(date, launchDate) : 1;
  if (number < 1) console.warn(`warning: ${date} is before VITE_LAUNCH_DATE (day #${number})`);
  return { date, dayNumber: number, prompts };
}

function write(payload: DailyPayload): void {
  const file = join('public', dailyPath(payload.date));
  writeFileSync(file, encodePayload(payload, payloadKey));
  console.log(`build-daily: wrote ${file} (#${payload.dayNumber})`);
}

checkLaunchDate('build-daily');

// Start from an empty folder so stale or future days are never published.
rmSync(OUT_DIR, { recursive: true, force: true });
mkdirSync(OUT_DIR, { recursive: true });

if (useFixture) {
  const prompts = fixturePrompts();
  if (prompts.length !== ROUNDS_PER_DAY) throw new Error('fixture needs 7 prompts');
  console.warn('build-daily: using FIXTURE prompts (not real content). Do not deploy this.');
  for (const date of dates) write(payloadFor(date, byDifficulty(prompts)));
} else {
  const { content, report } = loadContent('content');
  if (report.errors.length > 0) {
    printReport({ errors: report.errors, warnings: [] });
    console.error('build-daily: content has errors, run `npm run validate:content`');
    process.exit(1);
  }
  if (apiBase) {
    console.log('build-daily: VITE_API_BASE is set, the Worker serves the daily payload');
  } else {
    const scheduled = dates.filter((d) => content.schedule.has(d));
    if (scheduled.length > 0 && !launchDate) {
      console.error('build-daily: set VITE_LAUNCH_DATE (see .env.example)');
      process.exit(1);
    }
    for (const date of dates) {
      const prompts = promptsForDate(content, date);
      if (!prompts) {
        console.warn(`warning: no schedule for ${date}, players will see "sedang disiapkan"`);
        continue;
      }
      write(payloadFor(date, prompts));
    }
  }
}
