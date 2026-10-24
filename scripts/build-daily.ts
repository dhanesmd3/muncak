// content → public/daily/<date>.json for today and tomorrow (WIB). docs/05-teknis.md §9.
//
//   tsx scripts/build-daily.ts             real schedule (used by `npm run build`)
//   tsx scripts/build-daily.ts --fixture   fake prompts from tests/fixtures (local play only)
//   --now <ISO time>                       pretend it is this moment (for testing the script)
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadEnv } from 'vite';
import { ROUNDS_PER_DAY } from '../src/game/constants';
import { dailyPath } from '../src/game/daily';
import { addDays, dayNumber, isValidDate, todayWIB } from '../src/game/date';
import { DEFAULT_PAYLOAD_KEY, encodePayload } from '../src/game/payload';
import type { DailyPayload, Prompt } from '../src/game/types';
import { loadContent, printReport } from './content';

const args = process.argv.slice(2);
const useFixture = args.includes('--fixture');
const nowArg = args[args.indexOf('--now') + 1];
const now = args.includes('--now') && nowArg ? new Date(nowArg) : new Date();
if (Number.isNaN(now.getTime())) {
  console.error('build-daily: invalid --now value');
  process.exit(1);
}

const env = { ...loadEnv('production', process.cwd(), 'VITE_'), ...process.env };
const key = env.VITE_PAYLOAD_KEY || DEFAULT_PAYLOAD_KEY;
const launchDate = env.VITE_LAUNCH_DATE;

const OUT_DIR = join('public', 'daily');
const today = todayWIB(now);
const dates = [today, addDays(today, 1)];

/** Stable sort, easiest first (docs/02-game-design.md §2). */
const byDifficulty = (prompts: Prompt[]) =>
  prompts.map((p, i) => ({ p, i })).sort((a, b) => a.p.difficulty - b.p.difficulty || a.i - b.i);

function payloadFor(date: string, prompts: Prompt[]): DailyPayload {
  const number = launchDate ? dayNumber(date, launchDate) : 1;
  if (number < 1) console.warn(`warning: ${date} is before VITE_LAUNCH_DATE (day #${number})`);
  return { date, dayNumber: number, prompts: byDifficulty(prompts).map(({ p }) => p) };
}

function write(payload: DailyPayload): void {
  const file = join('public', dailyPath(payload.date));
  writeFileSync(file, encodePayload(payload, key));
  console.log(`build-daily: wrote ${file} (#${payload.dayNumber})`);
}

if (launchDate !== undefined && !isValidDate(launchDate)) {
  console.error(`build-daily: VITE_LAUNCH_DATE "${launchDate}" must be YYYY-MM-DD`);
  process.exit(1);
}

// Start from an empty folder so stale or future days are never published.
rmSync(OUT_DIR, { recursive: true, force: true });
mkdirSync(OUT_DIR, { recursive: true });

if (useFixture) {
  const prompts = JSON.parse(
    readFileSync(join('tests', 'fixtures', 'daily-prompts.json'), 'utf8'),
  ) as Prompt[];
  if (prompts.length !== ROUNDS_PER_DAY) throw new Error('fixture needs 7 prompts');
  console.warn('build-daily: using FIXTURE prompts (not real content). Do not deploy this.');
  for (const date of dates) write(payloadFor(date, prompts));
} else {
  const { content, report } = loadContent('content');
  if (report.errors.length > 0) {
    printReport({ errors: report.errors, warnings: [] });
    console.error('build-daily: content has errors, run `npm run validate:content`');
    process.exit(1);
  }
  const scheduled = dates.filter((d) => content.schedule.has(d));
  if (scheduled.length > 0 && !launchDate) {
    console.error('build-daily: set VITE_LAUNCH_DATE (see .env.example)');
    process.exit(1);
  }
  for (const date of dates) {
    const ids = content.schedule.get(date);
    if (!ids) {
      console.warn(`warning: no schedule for ${date}, players will see "sedang disiapkan"`);
      continue;
    }
    write(
      payloadFor(
        date,
        ids.map((id) => content.prompts.get(id)!),
      ),
    );
  }
}
