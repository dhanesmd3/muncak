import { describe, expect, it } from 'vitest';
import fixture from '../fixtures/daily-prompts.json';
import { isDailyPayload, parseDailyFile } from '../../src/game/daily';
import { decodePayload, encodePayload } from '../../src/game/payload';
import type { DailyPayload, Prompt } from '../../src/game/types';

const payload: DailyPayload = { date: '2026-12-01', dayNumber: 1, prompts: fixture as Prompt[] };

describe('payload obfuscation', () => {
  it('round-trips, including non-ASCII text', () => {
    const value = { text: "Sambal Luat · se'i · São Tomé · 🌼" };
    expect(decodePayload(encodePayload(value, 'k3y'), 'k3y')).toEqual(value);
  });

  it('does not contain the answers in plain text', () => {
    const file = encodePayload(payload, 'secret');
    expect(file).not.toContain('Merkurius');
    expect(file).not.toContain('Sebutkan');
  });

  it('fails with the wrong key', () => {
    const file = encodePayload(payload, 'right');
    expect(() => parseDailyFile(file, 'wrong', payload.date)).toThrow();
  });

  it('uses the default key when the key is empty', () => {
    expect(decodePayload(encodePayload({ a: 1 }, ''), 'muncak')).toEqual({ a: 1 });
  });
});

describe('parseDailyFile', () => {
  it('accepts a valid payload for the expected date', () => {
    const file = encodePayload(payload, 'k');
    expect(parseDailyFile(file, 'k', '2026-12-01')).toEqual(payload);
  });

  it('rejects a payload for another date', () => {
    const file = encodePayload(payload, 'k');
    expect(() => parseDailyFile(file, 'k', '2026-12-02')).toThrow(/expected 2026-12-02/);
  });

  it('rejects malformed payloads', () => {
    expect(isDailyPayload({ ...payload, prompts: payload.prompts.slice(1) })).toBe(false);
    expect(isDailyPayload({ ...payload, date: '2026-13-01' })).toBe(false);
    const noEdelweiss = payload.prompts.map((p, i) =>
      i === 0 ? { ...p, answers: p.answers.filter((a) => a.tier !== 'edelweiss') } : p,
    );
    expect(isDailyPayload({ ...payload, prompts: noEdelweiss })).toBe(false);
    expect(() => parseDailyFile('<!doctype html>', 'k', '2026-12-01')).toThrow();
  });
});
