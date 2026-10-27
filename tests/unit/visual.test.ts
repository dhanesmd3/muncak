import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PALETTE, PIXEL_KEY } from '../../src/scene/palette';
import {
  CLOUD,
  FLAG,
  HIKER_ANIMS,
  HIKER_H,
  HIKER_W,
  PINE,
  PINE_FAR,
  ROCK,
  SIGN,
  TENT,
  TIER_ICONS,
  hikerFrame,
  type HikerAnim,
  type Sprite,
} from '../../src/scene/sprites';

describe('palette', () => {
  it('has the 16 "Kabut Pagi" colors and matches tokens.css', () => {
    const css = readFileSync('src/styles/tokens.css', 'utf8');
    const values = Object.values(PALETTE);
    expect(new Set(values).size).toBe(16);
    for (const hex of values) expect(css.toLowerCase()).toContain(hex.toLowerCase());
  });
});

function expectSprite(s: Sprite, w?: number, h?: number) {
  const width = s[0]!.length;
  for (const row of s) {
    expect(row.length).toBe(width);
    for (const ch of row) expect(ch === '.' || ch in PIXEL_KEY).toBe(true);
  }
  if (w !== undefined) expect(width).toBe(w);
  if (h !== undefined) expect(s.length).toBe(h);
}

describe('sprites', () => {
  it('hiker frames are 16×24 and use only palette colors', () => {
    for (const anim of Object.keys(HIKER_ANIMS) as HikerAnim[]) {
      for (let f = 0; f < HIKER_ANIMS[anim].frames; f++) {
        expectSprite(hikerFrame(anim, f), HIKER_W, HIKER_H);
      }
    }
  });

  it('frame counts follow docs/04-art-ui.md §5.1', () => {
    expect(HIKER_ANIMS.idle.frames).toBe(4);
    expect(HIKER_ANIMS.walk.frames).toBe(6);
    expect(HIKER_ANIMS.jump.frames).toBe(4);
    expect(HIKER_ANIMS.cold.frames).toBe(3);
  });

  it('tier icons are 16×16', () => {
    for (const icon of Object.values(TIER_ICONS)) expectSprite(icon, 16, 16);
  });

  it('scene props are well-formed', () => {
    for (const s of [PINE, PINE_FAR, ROCK, TENT, SIGN, FLAG, CLOUD]) expectSprite(s);
  });
});

// WCAG relative luminance contrast.
function contrast(a: string, b: string): number {
  const lum = (hex: string) => {
    const [r, g, bl] = [1, 3, 5]
      .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r! + 0.7152 * g! + 0.0722 * bl!;
  };
  const [x, y] = [lum(a), lum(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

describe('text contrast ≥ 4.5:1 for the pairs used in app.css', () => {
  const P = PALETTE;
  it.each([
    ['awan on malam', P.awan, P.malam],
    ['batu on malam (Basecamp label)', P.batu, P.malam],
    ['senja on malam (Pos Camp label)', P.senja, P.malam],
    ['daun on malam (Batas Vegetasi label)', P.daun, P.malam],
    ['kabut on malam (Puncak label, links)', P.kabut, P.malam],
    ['edelweiss on malam', P.edelweiss, P.malam],
    ['abu on malam (muted text)', P.abu, P.malam],
    ['mentari on malam (warnings, streak)', P.mentari, P.malam],
    ['lumut on malam (toast)', P.lumut, P.malam],
    ['malam on senja (primary button)', P.malam, P.senja],
    ['malam on mentari (storage warning)', P.malam, P.mentari],
    ['malam on daun (toggle on)', P.malam, P.daun],
    ['malam on awan (answer input)', P.malam, P.awan],
    ['awan on lembah (panels)', P.awan, P.lembah],
    ['edelweiss on lembah (stat values)', P.edelweiss, P.lembah],
    ['mentari on lembah (checkpoint heading)', P.mentari, P.lembah],
    ['kabut on lembah (muted text on panels)', P.kabut, P.lembah],
    ['malam on awan (text inputs)', P.malam, P.awan],
  ])('%s', (_, fg, bg) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });

  it('Abu is too dark for text on Lembah panels', () => {
    expect(contrast(P.abu, P.lembah)).toBeLessThan(4.5);
  });

  it('Langit and Carrier are never used as text on Malam', () => {
    expect(contrast(P.langit, P.malam)).toBeLessThan(4.5);
    expect(contrast(P.carrier, P.malam)).toBeLessThan(4.5);
    const css = readFileSync('src/styles/app.css', 'utf8');
    expect(css).not.toMatch(/(^|[^-])color:\s*var\(--(langit|carrier|tier-summit)\)/m);
  });
});
