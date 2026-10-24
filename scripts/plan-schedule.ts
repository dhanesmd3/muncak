// Propose a month of Muncak Harian from verified prompts (docs/03-konten-soal.md §9.2).
//
//   tsx scripts/plan-schedule.ts 2026-12           print a proposal
//   tsx scripts/plan-schedule.ts 2026-12 --write   write content/schedule/2026-12.json
//
// Days already scheduled in that month are kept. Only complete days are proposed; a day
// whose slots cannot all be filled is reported and left out. Review the result by hand
// (e.g. spread Edelweiss across islands) before committing.
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPEAT_MIN_DAYS } from '../src/game/constants';
import { addDays, daysBetween, isValidDate } from '../src/game/date';
import type { Category, Prompt } from '../src/game/types';
import { loadContent, printReport } from './content';

interface Slot {
  categories: Category[] | null; // null = any category
  difficulty: number[];
}

const SLOTS: Slot[] = [
  { categories: null, difficulty: [1] },
  { categories: ['nusantara'], difficulty: [1, 2] },
  { categories: ['global'], difficulty: [2] },
  { categories: ['kuliner', 'alam'], difficulty: [2, 3] },
  { categories: ['pop', 'bola', 'sains'], difficulty: [3] },
  { categories: ['nusantara', 'sejarah'], difficulty: [3, 4] },
  { categories: null, difficulty: [4, 5] },
];

const [month, ...rest] = process.argv.slice(2);
if (!month || !/^\d{4}-\d{2}$/.test(month) || !isValidDate(`${month}-01`)) {
  console.error('usage: tsx scripts/plan-schedule.ts YYYY-MM [--write]');
  process.exit(1);
}

const { content, report } = loadContent('content');
if (report.errors.length > 0) {
  printReport({ errors: report.errors, warnings: [] });
  console.error('plan-schedule: fix content errors first');
  process.exit(1);
}

const verified = [...content.prompts.values()].filter((p) => p.status === 'verified');

// Every date each prompt is (or will be) shown, across all schedule files.
const uses = new Map<string, string[]>();
const use = (id: string, date: string) => uses.set(id, [...(uses.get(id) ?? []), date]);
for (const [date, ids] of content.schedule) for (const id of ids) use(id, date);

const fits = (p: Prompt, slot: Slot) =>
  (slot.categories === null || slot.categories.includes(p.category)) &&
  slot.difficulty.includes(p.difficulty);
const farEnough = (id: string, date: string) =>
  (uses.get(id) ?? []).every((d) => Math.abs(daysBetween(d, date)) >= REPEAT_MIN_DAYS);
const lastBefore = (id: string, date: string) =>
  (uses.get(id) ?? [])
    .filter((d) => d < date)
    .sort()
    .at(-1) ?? '';

const result: Record<string, string[]> = {};
const missing: string[] = [];
for (let date = `${month}-01`; date.startsWith(month); date = addDays(date, 1)) {
  const existing = content.schedule.get(date);
  if (existing) {
    result[date] = existing;
    continue;
  }
  const picked: string[] = [];
  for (const slot of SLOTS) {
    // Eligible: fits the slot, not used today, ≥ REPEAT_MIN_DAYS from any other showing.
    // Prefer prompts never shown, then the ones shown longest ago; ties by id.
    const candidates = verified
      .filter((p) => fits(p, slot) && !picked.includes(p.id) && farEnough(p.id, date))
      .sort(
        (a, b) =>
          lastBefore(a.id, date).localeCompare(lastBefore(b.id, date)) || a.id.localeCompare(b.id),
      );
    if (!candidates[0]) break;
    picked.push(candidates[0].id);
  }
  if (picked.length === SLOTS.length) {
    result[date] = picked;
    for (const id of picked) use(id, date);
  } else {
    missing.push(date);
  }
}

const json = JSON.stringify(result, null, 2) + '\n';
if (rest.includes('--write')) {
  const file = join('content', 'schedule', `${month}.json`);
  writeFileSync(file, json);
  console.log(`plan-schedule: wrote ${file} (${Object.keys(result).length} days)`);
} else {
  process.stdout.write(json);
}
if (missing.length > 0) {
  console.warn(
    `plan-schedule: not enough verified prompts for ${missing.length} day(s): ${missing.join(', ')}`,
  );
  console.warn(`(${verified.length} verified prompts available)`);
  process.exitCode = 1;
}
