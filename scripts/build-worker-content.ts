// content → worker/generated/content.json, bundled into the Worker at deploy time.
// Holds yesterday … +7 days of the schedule (so the Worker can serve today and re-score a
// session that crossed midnight) plus the bank prompts. The Worker never serves a future day.
//
//   tsx scripts/build-worker-content.ts             real content
//   tsx scripts/build-worker-content.ts --fixture   fixture prompts on every day (local dev)
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { addDays, todayWIB } from '../src/game/date';
import type { Prompt } from '../src/game/types';
import type { WorkerContent } from '../worker/src/env';
import { bankPrompts, byDifficulty, loadContent, printReport, promptsForDate } from './content';
import {
  checkLaunchDate,
  fixturePrompts,
  launchDate,
  payloadKey,
  scriptNow,
  useFixture,
} from './env';

const DAYS_BEFORE = 1;
const DAYS_AFTER = 7;

const now = scriptNow('build-worker-content');
const today = todayWIB(now);
checkLaunchDate('build-worker-content');
if (!launchDate && !useFixture) {
  console.error('build-worker-content: set VITE_LAUNCH_DATE (see .env.example)');
  process.exit(1);
}

const days: Record<string, Prompt[]> = {};
let bank: Prompt[];
if (useFixture) {
  console.warn('build-worker-content: using FIXTURE prompts. Do not deploy this.');
  const fixture = byDifficulty(fixturePrompts());
  for (let i = -DAYS_BEFORE; i <= DAYS_AFTER; i++) days[addDays(today, i)] = fixture;
  bank = fixture.map((p) => ({ ...p, pool: 'bank' as const }));
} else {
  const { content, report } = loadContent('content');
  if (report.errors.length > 0) {
    printReport({ errors: report.errors, warnings: [] });
    console.error('build-worker-content: content has errors, run `npm run validate:content`');
    process.exit(1);
  }
  for (let i = -DAYS_BEFORE; i <= DAYS_AFTER; i++) {
    const date = addDays(today, i);
    const prompts = promptsForDate(content, date);
    if (prompts) days[date] = prompts;
    else if (i <= 1) console.warn(`warning: no schedule for ${date}`);
  }
  bank = bankPrompts(content);
}

const out: WorkerContent = {
  version: 1,
  generatedAt: now.toISOString(),
  launchDate: useFixture ? today : (launchDate ?? today),
  payloadKey,
  days,
  bank,
};
mkdirSync(join('worker', 'generated'), { recursive: true });
writeFileSync(join('worker', 'generated', 'content.json'), JSON.stringify(out));
console.log(`build-worker-content: ${Object.keys(days).length} days, ${bank.length} bank prompts`);
