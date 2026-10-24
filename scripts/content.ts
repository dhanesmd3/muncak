import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { z } from 'zod';
import {
  EDELWEISS_FACT_MAX,
  MIN_ANSWER_LENGTH,
  MIN_ANSWERS_CLOSED,
  MIN_ANSWERS_OPEN,
  MOUNTAIN_FACT_MAX,
  REJECTED_REASON_MAX,
  REPEAT_MIN_DAYS,
  ROUNDS_PER_DAY,
} from '../src/game/constants';
import { daysBetween, isValidDate } from '../src/game/date';
import { collectKeys, refId } from '../src/game/match';
import type { Category, Mountain, Prompt } from '../src/game/types';

export const CATEGORIES = [
  'nusantara',
  'global',
  'kuliner',
  'sejarah',
  'alam',
  'pop',
  'bola',
  'sains',
] as const satisfies readonly Category[];
const TIERS = ['basecamp', 'camp', 'treeline', 'summit', 'edelweiss'] as const;

const dateString = z.string().refine(isValidDate, 'must be a real date in YYYY-MM-DD form');
const nonEmpty = z.string().trim().min(1);

export const AnswerSchema = z.strictObject({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'must be a lowercase slug'),
  text: nonEmpty,
  aliases: z.array(nonEmpty).optional(),
  tier: z.enum(TIERS),
});

export const RejectedSchema = z.strictObject({
  text: nonEmpty,
  aliases: z.array(nonEmpty).optional(),
  reason: nonEmpty.max(REJECTED_REASON_MAX),
});

export const PromptSchema = z.strictObject({
  id: z
    .string()
    .regex(
      new RegExp(`^(${CATEGORIES.join('|')})-[a-z0-9]+(?:-[a-z0-9]+)*-\\d{3}$`),
      'must look like <category>-<slug>-<number>, e.g. nusantara-provinsi-001',
    ),
  prompt: z.string().startsWith('Sebutkan', 'must start with "Sebutkan"'),
  category: z.enum(CATEGORIES),
  difficulty: z.literal([1, 2, 3, 4, 5]),
  closedSet: z.boolean(),
  optionalPrefixes: z.array(nonEmpty).optional(),
  answers: z.array(AnswerSchema).min(1),
  rejected: z.array(RejectedSchema).optional(),
  edelweissFact: nonEmpty.max(EDELWEISS_FACT_MAX),
  sources: z.array(nonEmpty).min(1),
  status: z.enum(['draft', 'review', 'verified', 'retired']),
  author: nonEmpty,
  verifiedBy: nonEmpty.optional(),
  validAsOf: dateString,
});

export const MountainSchema = z.strictObject({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: nonEmpty,
  shortName: nonEmpty,
  altitude: z.number().int().min(0),
  province: nonEmpty,
  fact: nonEmpty.max(MOUNTAIN_FACT_MAX),
  source: nonEmpty,
});

export const ScheduleSchema = z.record(z.string(), z.array(z.string()));

export const isPlaceholder = (s: string) => s.includes('[ISI');

export interface Report {
  errors: string[];
  warnings: string[];
}

export interface Content {
  prompts: Map<string, Prompt>;
  mountains: Mountain[];
  /** date → prompt ids, merged from every schedule file, sorted by date. */
  schedule: Map<string, string[]>;
}

function readJson(file: string, report: Report): unknown {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch (e) {
    report.errors.push(`${file}: invalid JSON (${(e as Error).message})`);
    return undefined;
  }
}

function issues(file: string, error: z.ZodError): string[] {
  return error.issues.map((i) => `${file}: ${i.path.join('.') || '(root)'}: ${i.message}`);
}

function jsonFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => join(dir, f));
}

/** Rules beyond the schema for one prompt (docs/03-konten-soal.md §2–3, docs/05-teknis.md §3). */
export function checkPrompt(p: Prompt, file: string, report: Report): void {
  const at = `${file}`;
  if (p.id !== basename(file, '.json')) report.errors.push(`${at}: id "${p.id}" ≠ file name`);
  if (!p.id.startsWith(`${p.category}-`)) {
    report.warnings.push(`${at}: id prefix does not match category "${p.category}"`);
  }

  const ids = new Set<string>();
  for (const a of p.answers) {
    if (ids.has(a.id)) report.errors.push(`${at}: duplicate answer id "${a.id}"`);
    ids.add(a.id);
  }

  const edelweiss = p.answers.filter((a) => a.tier === 'edelweiss').length;
  if (edelweiss !== 1) {
    report.errors.push(`${at}: needs exactly 1 edelweiss answer (found ${edelweiss})`);
  }

  if (p.status === 'verified') {
    if (!p.verifiedBy) report.errors.push(`${at}: status verified needs "verifiedBy"`);
    if (!p.sources.some((s) => !isPlaceholder(s))) {
      report.errors.push(`${at}: status verified needs at least 1 real source (not "[ISI")`);
    }
  }
  if (isPlaceholder(p.author)) report.warnings.push(`${at}: author is still a placeholder`);

  const min = p.closedSet ? MIN_ANSWERS_CLOSED : MIN_ANSWERS_OPEN;
  if (p.answers.length < min) {
    report.warnings.push(
      `${at}: only ${p.answers.length} answers (${p.closedSet ? 'closed' : 'open'} prompts want ≥ ${min})`,
    );
  }

  // After normalization: no key may point to two different entries, and no key may be
  // unreachable (empty or shorter than the minimum answer length).
  const owner = new Map<string, { id: string; source: string }>();
  for (const { key, source, ref } of collectKeys(p)) {
    const label = ref.type === 'answer' ? `answer "${ref.answerId}"` : `rejected "${source}"`;
    if (key.length < MIN_ANSWER_LENGTH) {
      report.errors.push(
        `${at}: "${source}" (${label}) normalizes to "${key}", too short to match`,
      );
      continue;
    }
    const id = refId(ref);
    const prev = owner.get(key);
    if (prev && prev.id !== id) {
      report.errors.push(
        `${at}: "${source}" collides with "${prev.source}" (both normalize to "${key}")`,
      );
    } else if (!prev) {
      owner.set(key, { id, source });
    }
  }
}

export function checkMountains(mountains: Mountain[], file: string, report: Report): void {
  if (mountains[0]?.altitude !== 0) report.errors.push(`${file}: first entry must be Basecamp (0)`);
  const ids = new Set<string>();
  mountains.forEach((m, i) => {
    if (ids.has(m.id)) report.errors.push(`${file}: duplicate id "${m.id}"`);
    ids.add(m.id);
    if (i > 0 && m.altitude <= mountains[i - 1]!.altitude) {
      report.errors.push(`${file}: "${m.id}" must be higher than the previous checkpoint`);
    }
    if (isPlaceholder(m.source)) report.warnings.push(`${file}: "${m.id}" source not filled in`);
  });
}

export function checkSchedule(content: Content, report: Report): void {
  const lastShown = new Map<string, string>();
  for (const [date, ids] of content.schedule) {
    const at = `schedule ${date}`;
    if (ids.length !== ROUNDS_PER_DAY) {
      report.errors.push(`${at}: needs exactly ${ROUNDS_PER_DAY} prompts (found ${ids.length})`);
    }
    if (new Set(ids).size !== ids.length) report.errors.push(`${at}: same prompt listed twice`);
    for (const id of ids) {
      const p = content.prompts.get(id);
      if (!p) {
        report.errors.push(`${at}: unknown prompt "${id}"`);
        continue;
      }
      if (p.status !== 'verified') {
        report.errors.push(`${at}: "${id}" is ${p.status}, only verified prompts may be scheduled`);
      }
      const prev = lastShown.get(id);
      if (prev && daysBetween(prev, date) < REPEAT_MIN_DAYS) {
        report.errors.push(
          `${at}: "${id}" was shown on ${prev}, repeats need ≥ ${REPEAT_MIN_DAYS} days`,
        );
      }
      lastShown.set(id, date);
    }
  }
}

/** Load and fully validate everything under `root` (the content/ directory). */
export function loadContent(root: string): { content: Content; report: Report } {
  const report: Report = { errors: [], warnings: [] };
  const content: Content = { prompts: new Map(), mountains: [], schedule: new Map() };

  for (const file of jsonFiles(join(root, 'prompts'))) {
    const parsed = PromptSchema.safeParse(readJson(file, report));
    if (!parsed.success) {
      report.errors.push(...issues(file, parsed.error));
      continue;
    }
    const p = parsed.data as Prompt;
    checkPrompt(p, file, report);
    if (content.prompts.has(p.id)) report.errors.push(`${file}: duplicate prompt id "${p.id}"`);
    content.prompts.set(p.id, p);
  }

  const mountainsFile = join(root, 'mountains.json');
  const mountains = z.array(MountainSchema).min(2).safeParse(readJson(mountainsFile, report));
  if (mountains.success) {
    content.mountains = mountains.data;
    checkMountains(content.mountains, mountainsFile, report);
  } else {
    report.errors.push(...issues(mountainsFile, mountains.error));
  }

  const entries: [string, string[]][] = [];
  for (const file of jsonFiles(join(root, 'schedule'))) {
    const month = basename(file, '.json');
    if (!/^\d{4}-\d{2}$/.test(month)) {
      report.errors.push(`${file}: file name must be YYYY-MM.json`);
      continue;
    }
    const parsed = ScheduleSchema.safeParse(readJson(file, report));
    if (!parsed.success) {
      report.errors.push(...issues(file, parsed.error));
      continue;
    }
    for (const [date, ids] of Object.entries(parsed.data)) {
      if (!isValidDate(date) || !date.startsWith(`${month}-`)) {
        report.errors.push(`${file}: "${date}" is not a date in ${month}`);
        continue;
      }
      entries.push([date, ids]);
    }
  }
  entries.sort(([a], [b]) => a.localeCompare(b));
  content.schedule = new Map(entries);
  checkSchedule(content, report);

  return { content, report };
}

export function printReport(report: Report): void {
  for (const w of report.warnings) console.warn(`warning: ${w}`);
  for (const e of report.errors) console.error(`error:   ${e}`);
}
