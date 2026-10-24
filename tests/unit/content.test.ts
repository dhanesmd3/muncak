import { describe, expect, it } from 'vitest';
import fixture from '../fixtures/daily-prompts.json';
import { checkPrompt, checkSchedule, loadContent, type Report } from '../../scripts/content';
import type { Prompt } from '../../src/game/types';

const base = (fixture as Prompt[])[0]!;
const check = (p: Prompt) => {
  const report: Report = { errors: [], warnings: [] };
  checkPrompt(p, `${p.id}.json`, report);
  return report;
};

describe('content in the repo', () => {
  it('validates without errors', () => {
    const { report } = loadContent('content');
    expect(report.errors).toEqual([]);
  });

  it('every prompt is draft or better, never auto-verified', () => {
    const { content } = loadContent('content');
    for (const p of content.prompts.values()) {
      if (p.status === 'verified') expect(p.verifiedBy).toBeTruthy();
    }
  });
});

describe('fixture prompts', () => {
  it('pass the prompt rules', () => {
    for (const p of fixture as Prompt[]) expect(check(p).errors).toEqual([]);
  });
});

describe('checkPrompt', () => {
  it('requires exactly one edelweiss', () => {
    const none = { ...base, answers: base.answers.filter((a) => a.tier !== 'edelweiss') };
    expect(check(none).errors.join()).toMatch(/exactly 1 edelweiss/);
    const two = {
      ...base,
      answers: base.answers.map((a) =>
        a.id === 'merah' ? { ...a, tier: 'edelweiss' as const } : a,
      ),
    };
    expect(check(two).errors.join()).toMatch(/exactly 1 edelweiss/);
  });

  it('catches an alias shared by two answers after normalization', () => {
    const p = {
      ...base,
      answers: base.answers.map((a) => (a.id === 'biru' ? { ...a, aliases: ['Mérah!'] } : a)),
    };
    expect(check(p).errors.join()).toMatch(/collides/);
  });

  it('catches an alias that equals a rejected entry', () => {
    const p = {
      ...base,
      answers: base.answers.map((a) => (a.id === 'ungu' ? { ...a, aliases: ['hitam'] } : a)),
    };
    expect(check(p).errors.join()).toMatch(/collides/);
  });

  it('allows the same key twice within one answer', () => {
    const p = {
      ...base,
      answers: base.answers.map((a) => (a.id === 'merah' ? { ...a, aliases: ['warna merah'] } : a)),
    };
    expect(check(p).errors).toEqual([]);
  });

  it('flags keys too short to ever match', () => {
    const p = {
      ...base,
      answers: base.answers.map((a) => (a.id === 'merah' ? { ...a, aliases: ['m'] } : a)),
    };
    expect(check(p).errors.join()).toMatch(/too short/);
  });

  it('requires verifiedBy and a real source for verified prompts', () => {
    const p = { ...base, status: 'verified' as const, sources: ['[ISI: sumber]'] };
    const errors = check(p).errors.join('\n');
    expect(errors).toMatch(/verifiedBy/);
    expect(errors).toMatch(/real source/);
  });

  it('warns (not errors) when there are too few answers', () => {
    const r = check(base);
    expect(r.errors).toEqual([]);
    expect(r.warnings.join()).toMatch(/only 7 answers/);
  });

  it('requires the id to match the file name', () => {
    const report: Report = { errors: [], warnings: [] };
    checkPrompt(base, 'other-name.json', report);
    expect(report.errors.join()).toMatch(/file name/);
  });
});

describe('checkSchedule', () => {
  const verified = (fixture as Prompt[]).map((p) => ({
    ...p,
    status: 'verified' as const,
    verifiedBy: 'tester',
  }));
  const ids = verified.map((p) => p.id);
  const run = (schedule: [string, string[]][], prompts: Prompt[] = verified) => {
    const report: Report = { errors: [], warnings: [] };
    checkSchedule(
      {
        prompts: new Map(prompts.map((p) => [p.id, p])),
        mountains: [],
        schedule: new Map(schedule),
      },
      report,
    );
    return report.errors.join('\n');
  };

  it('accepts 7 verified prompts', () => {
    expect(run([['2026-12-01', ids]])).toBe('');
  });

  it('needs exactly 7 distinct prompts', () => {
    expect(run([['2026-12-01', ids.slice(0, 6)]])).toMatch(/exactly 7/);
    expect(run([['2026-12-01', [...ids.slice(0, 6), ids[0]!]]])).toMatch(/twice/);
  });

  it('only allows verified prompts', () => {
    expect(run([['2026-12-01', ids]], fixture as Prompt[])).toMatch(/only verified/);
  });

  it('blocks repeats within 30 days', () => {
    expect(
      run([
        ['2026-12-01', ids],
        ['2026-12-30', ids],
      ]),
    ).toMatch(/≥ 30 days/);
    expect(
      run([
        ['2026-12-01', ids],
        ['2026-12-31', ids],
      ]),
    ).toBe('');
  });

  it('reports unknown prompt ids', () => {
    expect(run([['2026-12-01', [...ids.slice(0, 6), 'nope-001']]])).toMatch(/unknown prompt/);
  });
});
