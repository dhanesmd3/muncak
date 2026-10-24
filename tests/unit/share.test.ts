import { describe, expect, it } from 'vitest';
import { formatNumber } from '../../src/i18n/id';
import { shareText } from '../../src/share/share';

describe('shareText (docs/02-game-design.md §3.1)', () => {
  it('matches the documented format', () => {
    expect(
      shareText({
        dayNumber: 42,
        altitude: 3676,
        mountainShortName: 'Semeru',
        outcomes: ['basecamp', 'edelweiss', 'treeline', 'summit', 'camp', 'fog', 'summit'],
        url: 'https://muncak.example/',
      }),
    ).toBe('Muncak #42 🏔️\n3.676 mdpl · Semeru\n🥾🌼🌲🏔️⛺🌫️🏔️\nhttps://muncak.example/');
  });
});

describe('formatNumber', () => {
  it('uses a dot as thousands separator', () => {
    expect(formatNumber(0)).toBe('0');
    expect(formatNumber(700)).toBe('700');
    expect(formatNumber(4884)).toBe('4.884');
    expect(formatNumber(1234567)).toBe('1.234.567');
  });
});
