import { describe, expect, it } from 'vitest';
import { normalize, normalizeBase } from '../../src/game/normalize';

describe('normalizeBase', () => {
  it('lowercases and trims extra spaces', () => {
    expect(normalizeBase('  JAWA   Barat ')).toBe('jawa barat');
  });

  it('strips diacritics', () => {
    expect(normalizeBase('São Tomé')).toBe('sao tome');
    expect(normalizeBase('Crème Brûlée')).toBe('creme brulee');
  });

  it('removes apostrophes without adding a space', () => {
    expect(normalizeBase("se'i luat")).toBe('sei luat');
    expect(normalizeBase('Jum’at')).toBe('jumat');
    expect(normalizeBase('d`arc')).toBe('darc');
  });

  it('turns punctuation and hyphens into single spaces', () => {
    expect(normalizeBase('dabu-dabu')).toBe('dabu dabu');
    expect(normalizeBase('Colo--colo!!')).toBe('colo colo');
    expect(normalizeBase('Sulawesi, Barat.')).toBe('sulawesi barat');
  });

  it('keeps letters and digits from any script', () => {
    expect(normalizeBase('Liga 1')).toBe('liga 1');
  });

  it('returns an empty string for punctuation only', () => {
    expect(normalizeBase(' -- !! ')).toBe('');
  });
});

describe('normalize with optional prefixes', () => {
  it('drops a prefix followed by a space', () => {
    expect(normalize('Sambal Matah', ['sambal'])).toBe('matah');
    expect(normalize('provinsi jawa barat', ['provinsi', 'prov'])).toBe('jawa barat');
  });

  it('checks the longest prefix first', () => {
    expect(normalize('gunung api purba', ['gunung', 'gunung api'])).toBe('purba');
  });

  it('only drops a whole word', () => {
    expect(normalize('sambalado', ['sambal'])).toBe('sambalado');
    expect(normalize('provinsial', ['prov'])).toBe('provinsial');
  });

  it('keeps an input that is only the prefix', () => {
    expect(normalize('Sambal', ['sambal'])).toBe('sambal');
  });

  it('normalizes the prefixes themselves', () => {
    expect(normalize('SAMBEL ijo', ['Sambel'])).toBe('ijo');
  });

  it('is identical for input and answer text', () => {
    const prefixes = ['sambal', 'sambel'];
    expect(normalize('  sambel   DABU-dabu ', prefixes)).toBe(
      normalize('Sambal Dabu-dabu', prefixes),
    );
  });
});
