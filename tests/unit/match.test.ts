import { describe, expect, it } from 'vitest';
import {
  buildIndex,
  collectKeys,
  matchAnswer,
  maxTypoDistance,
  osaDistance,
} from '../../src/game/match';
import type { Prompt } from '../../src/game/types';

const prompt: Prompt = {
  id: 'test-provinsi-001',
  prompt: 'Sebutkan provinsi di Indonesia',
  category: 'nusantara',
  difficulty: 1,
  closedSet: true,
  optionalPrefixes: ['provinsi', 'prov'],
  answers: [
    { id: 'jabar', text: 'Jawa Barat', aliases: ['jabar'], tier: 'basecamp' },
    { id: 'jateng', text: 'Jawa Tengah', aliases: ['jateng'], tier: 'basecamp' },
    { id: 'jambi', text: 'Jambi', tier: 'treeline' },
    { id: 'bali', text: 'Bali', tier: 'basecamp' },
    { id: 'diy', text: 'DI Yogyakarta', aliases: ['jogja', 'yogyakarta', 'diy'], tier: 'basecamp' },
    { id: 'sulbar', text: 'Sulawesi Barat', aliases: ['sulbar'], tier: 'summit' },
    { id: 'pabar', text: 'Papua Barat', tier: 'treeline' },
    { id: 'pbd', text: 'Papua Barat Daya', aliases: ['pbd'], tier: 'edelweiss' },
    { id: 'sumut', text: 'Sumatera Utara', aliases: ['sumatra utara'], tier: 'basecamp' },
  ],
  rejected: [
    { text: 'Irian Jaya', aliases: ['irian'], reason: 'Nama lama.' },
    { text: 'Sumatera', aliases: ['sumatra'], reason: 'Itu pulau.' },
  ],
  edelweissFact: 'Fakta.',
  sources: ['test'],
  status: 'draft',
  author: 'test',
  validAsOf: '2026-10-21',
};

const index = buildIndex(prompt);
const m = (input: string, prev: string[] = []) => matchAnswer(index, input, prev);

describe('exact matching', () => {
  it('accepts the official text', () => {
    expect(m('Jawa Barat')).toEqual({
      kind: 'accepted',
      answerId: 'jabar',
      tier: 'basecamp',
      fuzzy: false,
    });
  });

  it('accepts aliases', () => {
    expect(m('JOGJA')).toMatchObject({ kind: 'accepted', answerId: 'diy', fuzzy: false });
    expect(m('pbd')).toMatchObject({ kind: 'accepted', answerId: 'pbd', tier: 'edelweiss' });
  });

  it('accepts with or without the optional prefix', () => {
    expect(m('provinsi jambi')).toMatchObject({ kind: 'accepted', answerId: 'jambi' });
    expect(m('Prov. Bali')).toMatchObject({ kind: 'accepted', answerId: 'bali' });
  });

  it('ignores diacritics, case and punctuation', () => {
    expect(m('  JAWA-tengah!! ')).toMatchObject({ kind: 'accepted', answerId: 'jateng' });
    expect(m('Bálí')).toMatchObject({ kind: 'accepted', answerId: 'bali' });
  });

  it('returns the reason for rejected answers', () => {
    expect(m('Irian Jaya')).toEqual({ kind: 'rejected', reason: 'Nama lama.' });
    expect(m('sumatra')).toEqual({ kind: 'rejected', reason: 'Itu pulau.' });
  });

  it('tells Papua Barat and Papua Barat Daya apart', () => {
    expect(m('Papua Barat')).toMatchObject({ kind: 'accepted', answerId: 'pabar', fuzzy: false });
    expect(m('Papua Barat Daya')).toMatchObject({
      kind: 'accepted',
      answerId: 'pbd',
      fuzzy: false,
    });
  });
});

describe('guards', () => {
  it('rejects inputs shorter than 2 characters without penalty', () => {
    expect(m('a')).toEqual({ kind: 'too_short' });
    expect(m('  ')).toEqual({ kind: 'too_short' });
    expect(m('provinsi x')).toEqual({ kind: 'too_short' });
  });

  it('flags an input already tried this round', () => {
    expect(m('Jawa Timur', ['jawa timur'])).toEqual({ kind: 'duplicate' });
    expect(m('provinsi jawa timur', ['jawa timur'])).toEqual({ kind: 'duplicate' });
  });

  it('returns unknown for answers that are not listed', () => {
    expect(m('Atlantis')).toEqual({ kind: 'unknown' });
  });
});

describe('typo tolerance', () => {
  it('allows no typos for inputs of 4 characters or fewer', () => {
    expect(maxTypoDistance(4)).toBe(0);
    expect(m('Bale')).toEqual({ kind: 'unknown' });
  });

  it('allows 1 typo for 5–8 characters and 2 for 9+', () => {
    expect(maxTypoDistance(5)).toBe(1);
    expect(maxTypoDistance(8)).toBe(1);
    expect(maxTypoDistance(9)).toBe(2);
    expect(m('Jambii')).toMatchObject({ kind: 'accepted', answerId: 'jambi', fuzzy: true });
    expect(m('Jawa Barrt')).toMatchObject({ kind: 'accepted', answerId: 'jabar', fuzzy: true });
    expect(m('Jawa Bxrxt')).toMatchObject({ kind: 'accepted', answerId: 'jabar', fuzzy: true });
    expect(m('Jxwx Bxrxt')).toEqual({ kind: 'unknown' });
  });

  it('counts an adjacent transposition as one edit', () => {
    expect(m('Sulawesi Barta')).toMatchObject({
      kind: 'accepted',
      answerId: 'sulbar',
      fuzzy: true,
    });
  });

  it('prefers an exact match over a closer-looking typo', () => {
    // "papua barat" is exact for pabar, even though it is 5 edits from "papua barat daya".
    expect(m('papua barat')).toMatchObject({ answerId: 'pabar', fuzzy: false });
    expect(m('papua barat dayy')).toMatchObject({ answerId: 'pbd', fuzzy: true });
  });

  it('returns unknown when the closest keys point to different entries', () => {
    const near = buildIndex({
      ...prompt,
      optionalPrefixes: [],
      answers: [
        { id: 'merah', text: 'Desa Merah', tier: 'basecamp' },
        { id: 'merak', text: 'Desa Merak', tier: 'camp' },
        { id: 'e', text: 'Edelweiss', tier: 'edelweiss' },
      ],
      rejected: [],
    });
    // "desa mera" is 1 edit from both "desa merah" and "desa merak".
    expect(matchAnswer(near, 'desa mera')).toEqual({ kind: 'unknown' });
    // One edit from "desa merah" but two from "desa merak": not ambiguous.
    expect(matchAnswer(near, 'desa merahh')).toMatchObject({ kind: 'accepted', answerId: 'merah' });
  });

  it('does not treat two keys of the same entry as ambiguous', () => {
    // 1 edit from "sumatera utara" (transposition) and 1 from the alias "sumatra utara".
    expect(m('Sumatrea Utara')).toMatchObject({ kind: 'accepted', answerId: 'sumut', fuzzy: true });
  });

  it('can fuzzily hit a rejected entry', () => {
    expect(m('Irian Jayaa')).toEqual({ kind: 'rejected', reason: 'Nama lama.' });
  });
});

describe('osaDistance', () => {
  const d = (a: string, b: string, limit = 5) => osaDistance([...a], [...b], limit);
  it('computes edit distances', () => {
    expect(d('kitten', 'sitting')).toBe(3);
    expect(d('', 'abc')).toBe(3);
    expect(d('abc', 'abc')).toBe(0);
    expect(d('ab', 'ba')).toBe(1);
    expect(d('barat', 'barta')).toBe(1);
  });

  it('exits early once the limit is exceeded', () => {
    expect(d('aaaaaaaa', 'bbbbbbbb', 2)).toBe(3);
    expect(d('a', 'abcdef', 2)).toBe(3);
  });
});

describe('collectKeys', () => {
  it('lists every normalized text and alias', () => {
    const keys = collectKeys(prompt).map((k) => k.key);
    expect(keys).toContain('jawa barat');
    expect(keys).toContain('jabar');
    expect(keys).toContain('irian jaya');
    expect(keys).toContain('di yogyakarta');
  });
});
