// Generate PWA icons, favicon and the Open Graph preview image from pixel art.
//   tsx scripts/generate-icons.ts
// Output is committed to public/, so this only needs re-running when the art changes.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PALETTE as P } from '../src/scene/palette';
import { CLOUD, FLAG, PINE, hikerFrame } from '../src/scene/sprites';
import { PixelCanvas } from './png';

/** Mountain with a red-and-white flag on a Malam background, drawn into an n×n box. */
function drawIcon(c: PixelCanvas, ox: number, oy: number, n: number): void {
  const at = (f: number) => Math.round(f * n);
  // Sun
  const sx = ox + at(0.74);
  const sy = oy + at(0.3);
  const r = Math.max(2, at(0.11));
  for (let y = -r; y <= r; y++) {
    for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r) c.set(sx + x, sy + y, P.mentari);
  }
  // Mountain: peak at (0.5n, 0.34n), base at 0.84n
  const peakX = ox + n / 2;
  const peakY = oy + at(0.34);
  const baseY = oy + at(0.84);
  const halfBase = n * 0.4;
  for (let y = peakY; y < baseY; y++) {
    const half = ((y - peakY) / (baseY - peakY)) * halfBase;
    for (let x = Math.round(peakX - half); x <= Math.round(peakX + half) - 1; x++) {
      const snow = y - peakY < (baseY - peakY) * 0.28;
      const shade = x >= peakX;
      c.set(x, y, snow ? (shade ? P.kabut : P.awan) : shade ? P.lembah : P.langit);
    }
  }
  // Ground
  c.rect(ox, baseY, n, oy + n - baseY, P.hutan);
  c.rect(ox, baseY, n, 1, P.daun);
  // Flag on the peak
  const pole = Math.max(4, at(0.2));
  const flagW = Math.max(3, at(0.16));
  const flagH = Math.max(2, Math.round(pole / 2) & ~1);
  c.rect(Math.round(peakX) - 1, peakY - pole, 1, pole, P.awan);
  c.rect(Math.round(peakX), peakY - pole, flagW, flagH / 2, P.carrier);
  c.rect(Math.round(peakX), peakY - pole + flagH / 2, flagW, flagH / 2, P.awan);
}

function icon(size: number, logical: number, inset: number): Buffer {
  const c = new PixelCanvas(logical, logical, P.malam);
  drawIcon(c, inset, inset, logical - inset * 2);
  return c.png(size / logical);
}

// 5×7 pixel font for the preview image (only the glyphs it needs).
const GLYPHS: Record<string, string[]> = {
  M: ['X...X', 'XX.XX', 'X.X.X', 'X.X.X', 'X...X', 'X...X', 'X...X'],
  U: ['X...X', 'X...X', 'X...X', 'X...X', 'X...X', 'X...X', '.XXX.'],
  N: ['X...X', 'XX..X', 'X.X.X', 'X..XX', 'X...X', 'X...X', 'X...X'],
  C: ['.XXX.', 'X...X', 'X....', 'X....', 'X....', 'X...X', '.XXX.'],
  A: ['.XXX.', 'X...X', 'X...X', 'XXXXX', 'X...X', 'X...X', 'X...X'],
  K: ['X...X', 'X..X.', 'X.X..', 'XX...', 'X.X..', 'X..X.', 'X...X'],
  I: ['XXX', '.X.', '.X.', '.X.', '.X.', '.X.', 'XXX'],
  L: ['X....', 'X....', 'X....', 'X....', 'X....', 'X....', 'XXXXX'],
  G: ['.XXX.', 'X...X', 'X....', 'X.XXX', 'X...X', 'X...X', '.XXX.'],
  T: ['XXXXX', '..X..', '..X..', '..X..', '..X..', '..X..', '..X..'],
  ',': ['..', '..', '..', '..', '..', '.X', 'X.'],
  '.': ['.', '.', '.', '.', '.', '.', 'X'],
  ' ': ['...', '...', '...', '...', '...', '...', '...'],
};

function textWidth(text: string, scale: number): number {
  return [...text].reduce((w, ch) => w + (GLYPHS[ch]![0]!.length + 1) * scale, -scale);
}

function drawText(
  c: PixelCanvas,
  text: string,
  x: number,
  y: number,
  scale: number,
  color: string,
) {
  for (const ch of text) {
    const g = GLYPHS[ch]!;
    g.forEach((row, j) => {
      for (let i = 0; i < row.length; i++) {
        if (row[i] === 'X') c.rect(x + i * scale, y + j * scale, scale, scale, color);
      }
    });
    x += (g[0]!.length + 1) * scale;
  }
}

function ogImage(): Buffer {
  const W = 200;
  const H = 105; // × 6 = 1200 × 630
  const c = new PixelCanvas(W, H, P.kabut);
  c.rect(0, 0, W, 22, P.langit);
  c.rect(0, 70, W, H - 70, P.mentari);
  // Morning sun
  for (let y = -9; y <= 9; y++) {
    for (let x = -9; x <= 9; x++) {
      const d = x * x + y * y;
      if (d <= 81) c.set(30 + x, 40 + y, d <= 49 ? P.edelweiss : P.mentari);
    }
  }
  // Distant ranges
  for (let x = 0; x < W; x++) {
    const back = Math.round(26 + 10 * Math.sin(x * 0.04) + 5 * Math.sin(x * 0.11 + 1));
    c.rect(x, 82 - back, 1, H, P.langit);
    const front = Math.round(14 + 5 * Math.sin(x * 0.06 + 2));
    c.rect(x, 92 - front, 1, H, P.lembah);
  }
  c.sprite(CLOUD, 20, 10);
  c.sprite(CLOUD, 120, 26);
  // Trail slope with pines, hiker and flag
  for (let x = 0; x < W; x++) {
    const gy = Math.round(100 - (x - 40) * 0.25);
    c.rect(x, gy - 1, 1, 1, P.lumut);
    c.rect(x, gy, 1, 3, P.tanah);
    c.rect(x, gy + 3, 1, H, P.daun);
  }
  for (const px of [6, 22, 98, 150, 182])
    c.sprite(PINE, px, Math.round(100 - (px + 4 - 40) * 0.25) - 16);
  c.sprite(hikerFrame('jump', 0), 32, 77);
  c.sprite(FLAG, 50, 82);
  // Title panel
  const title = 'MUNCAK';
  const tag = 'MAKIN LANGKA, MAKIN TINGGI.';
  const tw = textWidth(title, 3);
  const gw = textWidth(tag, 1);
  const panelW = Math.max(tw, gw) + 16;
  const px = Math.round((W - panelW) / 2) + 20;
  c.rect(px, 14, panelW, 44, P.malam);
  drawText(c, title, px + Math.round((panelW - tw) / 2), 20, 3, P.edelweiss);
  drawText(c, tag, px + Math.round((panelW - gw) / 2), 46, 1, P.awan);
  return c.png(6);
}

const out = 'public';
mkdirSync(join(out, 'icons'), { recursive: true });
writeFileSync(join(out, 'favicon.png'), icon(32, 32, 0));
writeFileSync(join(out, 'icons', 'icon-192.png'), icon(192, 32, 0));
writeFileSync(join(out, 'icons', 'icon-512.png'), icon(512, 32, 0));
// Maskable: art inside the central safe zone.
writeFileSync(join(out, 'icons', 'maskable-512.png'), icon(512, 32, 5));
writeFileSync(join(out, 'icons', 'apple-touch-icon.png'), icon(180, 36, 2));
writeFileSync(join(out, 'og-image.png'), ogImage());
console.log('generate-icons: wrote favicon, PWA icons and og-image.png');
