// Pixel sprites as strings, one character per pixel (see PIXEL_KEY in palette.ts).
// Pure data + composition, so the same art is used by the canvas scene, the UI icons
// and scripts/generate-icons.ts.
import type { Outcome } from '../game/types';

export type Sprite = readonly string[];

// ── Hiker (16×24, facing right): red carrier, jungle hat, brown boots ──────────────

const HIKER_TOP: Sprite = [
  '................',
  '..KKKK..........',
  '.KRRRRK..KKKK...',
  '.KRDDRK.KHHHHK..',
  '.KRRRRKKHHHHHHK.',
  '.KRDDRK.KKBBBBK.',
  '.KRRRRK..KBBKBK.',
  '.KRDDRK..KBBBBK.',
  '.KRRRRK...KBBK..',
  '.KRDDRKKKKSSSK..',
  '.KRRRRKSSSSSSSK.',
  '.KRDDRKSSSSLSSK.',
  '.KRRRRKSSSSLSSK.',
  '.KDDDDKSSSSBSK..',
  '..KKKKKSSSSBK...',
  '......KLLLLLK...',
];

/** Same body with the free arm raised (for jumping). */
const HIKER_TOP_CHEER: Sprite = [
  '..............K.',
  '..KKKK.......KBK',
  '.KRRRRK..KKKKKBK',
  '.KRDDRK.KHHHHKSK',
  '.KRRRRKKHHHHHHSK',
  '.KRDDRK.KKBBBBSK',
  '.KRRRRK..KBBKBSK',
  '.KRDDRK..KBBBBSK',
  '.KRRRRK...KBBKSK',
  '.KRDDRKKKKSSSSSK',
  '.KRRRRKSSSSSSSK.',
  '.KRDDRKSSSSSSSK.',
  '.KRRRRKSSSSSSSK.',
  '.KDDDDKSSSSSSK..',
  '..KKKKKSSSSSSK..',
  '......KLLLLLK...',
];

/** Arms hugged to the body, cold face (for fog). */
const HIKER_TOP_COLD: Sprite = [
  '................',
  '..KKKK..........',
  '.KRRRRK..KKKK...',
  '.KRDDRK.KHHHHK..',
  '.KRRRRKKHHHHHHK.',
  '.KRDDRK.KKFFFFK.',
  '.KRRRRK..KFFKFK.',
  '.KRDDRK..KFFFFK.',
  '.KRRRRK...KFFK..',
  '.KRDDRKKKKSSSK..',
  '.KRRRRKSSSSSSSK.',
  '.KRDDRKSSLLLLSK.',
  '.KRRRRKSSSFFLSK.',
  '.KDDDDKSSSSSSK..',
  '..KKKKKSSSSSK...',
  '......KLLLLLK...',
];

/** Holding a camera in front of the face (foto edelweiss). */
const HIKER_TOP_PHOTO: Sprite = [
  '................',
  '..KKKK..........',
  '.KRRRRK..KKKK...',
  '.KRDDRK.KHHHHK..',
  '.KRRRRKKHHHHHHK.',
  '.KRDDRK.KKBBKKKK',
  '.KRRRRK..KBKAAAK',
  '.KRDDRK..KBKAKAK',
  '.KRRRRK...KKAAAK',
  '.KRDDRKKKKSSKKKK',
  '.KRRRRKSSSSSSBK.',
  '.KRDDRKSSSSSSBK.',
  '.KRRRRKSSSSSSK..',
  '.KDDDDKSSSSSSK..',
  '..KKKKKSSSSSK...',
  '......KLLLLLK...',
];

const HIKER_TOP_PHOTO_FLASH: Sprite = HIKER_TOP_PHOTO.map((row, y) =>
  y === 5 ? row.slice(0, 14) + 'WW' : y === 6 ? row.slice(0, 15) + 'W' : row,
);

const LEGS_STAND: Sprite = [
  '......KLLLLLK...',
  '......KLLKLLK...',
  '......KLLKLLK...',
  '......KLLKLLK...',
  '......KLLKLLK...',
  '.....KTTKKTTK...',
  '.....KTTTKTTTK..',
  '.....KKKKKKKKK..',
];

const LEGS_STRIDE: Sprite = [
  '......KLLLLLK...',
  '.....KLLLKLLLK..',
  '.....KLLKKKLLK..',
  '....KLLK..KLLK..',
  '....KLLK...KLLK.',
  '...KTTK....KTTK.',
  '...KTTTK...KTTTK',
  '...KKKKK...KKKKK',
];

const LEGS_PASS: Sprite = [
  '......KLLLLLK...',
  '......KLLLLLK...',
  '......KLLKLLK...',
  '......KLLKLLK...',
  '.......KLKLLK...',
  '......KTTKTTK...',
  '......KTTKTTTK..',
  '......KKKKKKKK..',
];

const LEGS_TUCK: Sprite = [
  '......KLLLLLK...',
  '.....KLLLLLLLK..',
  '....KLLKKKKLLK..',
  '....KTTK...KTTK.',
  '....KTTTK..KTTTK',
  '....KKKKK..KKKKK',
  '................',
  '................',
];

export const HIKER_W = 16;
export const HIKER_H = 24;

export type HikerAnim = 'idle' | 'walk' | 'jump' | 'cold' | 'photo' | 'wave';

/** Frame count and speed per animation (docs/04-art-ui.md §5.1). */
export const HIKER_ANIMS: Record<HikerAnim, { frames: number; fps: number }> = {
  idle: { frames: 4, fps: 4 },
  walk: { frames: 6, fps: 10 },
  jump: { frames: 4, fps: 8 },
  cold: { frames: 3, fps: 6 },
  photo: { frames: 6, fps: 8 },
  wave: { frames: 4, fps: 6 },
};

function shift(sprite: Sprite, dx: number, dy: number): Sprite {
  const w = sprite[0]!.length;
  const blank = '.'.repeat(w);
  const rows = sprite.map((row) =>
    dx >= 0 ? ('.'.repeat(dx) + row).slice(0, w) : (row + '.'.repeat(-dx)).slice(-dx),
  );
  if (dy < 0) return [...rows.slice(-dy), ...Array<string>(-dy).fill(blank)];
  if (dy > 0) return [...Array<string>(dy).fill(blank), ...rows.slice(0, rows.length - dy)];
  return rows;
}

/** How far the hiker is lifted off the ground in this frame (jumping only). */
export function hikerLift(anim: HikerAnim, frame: number): number {
  return anim === 'jump' ? [0, 3, 4, 2][frame % HIKER_ANIMS.jump.frames]! : 0;
}

/** Compose one hiker frame. */
export function hikerFrame(anim: HikerAnim, frame: number): Sprite {
  const f = frame % HIKER_ANIMS[anim].frames;
  switch (anim) {
    case 'idle':
      // Breathing: the upper body dips one pixel on frames 2–3.
      return [...shift(HIKER_TOP, 0, f >= 2 ? 1 : 0), ...LEGS_STAND];
    case 'walk': {
      const legs = [LEGS_STRIDE, LEGS_STRIDE, LEGS_PASS, LEGS_STRIDE, LEGS_STRIDE, LEGS_PASS][f]!;
      const bob = f === 1 || f === 4 ? 1 : 0;
      return [...shift(HIKER_TOP, 0, bob), ...legs];
    }
    case 'jump':
      return [...HIKER_TOP_CHEER, ...(f === 0 ? LEGS_STAND : LEGS_TUCK)];
    case 'cold':
      return shift([...HIKER_TOP_COLD, ...LEGS_STAND], [0, 1, -1][f]!, 0);
    case 'photo':
      // Camera up to the face; frame 3 is the flash.
      return [...(f === 3 ? HIKER_TOP_PHOTO_FLASH : HIKER_TOP_PHOTO), ...LEGS_STAND];
    case 'wave':
      // Arm raised holding the pole; the flag cloth is drawn by the scene (FLAG_WAVE).
      return [...HIKER_TOP_CHEER, ...LEGS_STAND];
  }
}

// ── Tier icons (16×16) ────────────────────────────────────────────────────────────

export const TIER_ICONS: Record<Outcome, Sprite> = {
  basecamp: [
    '................',
    '................',
    '....KKKKK.......',
    '....KBBBK.......',
    '....KBTBK.......',
    '....KBBBK.......',
    '....KBTBK.......',
    '....KBBBKK......',
    '....KBBBBBKK....',
    '...KBBBBBBBBK...',
    '...KBBBBBBBBBK..',
    '...KBBBBBBBBBK..',
    '...KTTTTTTTTTK..',
    '...KKKKKKKKKKK..',
    '................',
    '................',
  ],
  camp: [
    '................',
    '................',
    '.......K........',
    '......KOK.......',
    '.....KOOOK......',
    '.....KOOOK......',
    '....KOOKOOK.....',
    '....KOOKOOK.....',
    '...KOOKKKOOK....',
    '...KOOKKKOOK....',
    '..KOOOKKKOOOK...',
    '..KOOOKKKOOOK...',
    '.KOOOOKKKOOOOK..',
    '.KKKKKKKKKKKKK..',
    '................',
    '................',
  ],
  treeline: [
    '.......K........',
    '......KGK.......',
    '.....KGGGK......',
    '....KGGHGGK.....',
    '.....KGGGK......',
    '....KGGGGGK.....',
    '...KGGHGGGGK....',
    '....KGGGGHK.....',
    '...KGGGGGGGK....',
    '..KGHGGGGGHGK...',
    '.KGGGGGGGGGGGK..',
    '..KKKKKTKKKKK...',
    '......KTK.......',
    '......KTK.......',
    '......KKK.......',
    '................',
  ],
  summit: [
    '................',
    '................',
    '.......K........',
    '......KWK.......',
    '.....KWWWK......',
    '.....KWSWK......',
    '....KSWSSSK.....',
    '....KSSSSSK.....',
    '...KSSSSLSSK....',
    '...KSLSSSSSK....',
    '..KSSSSSSSLSK...',
    '..KSSSLSSSSSK...',
    '.KSSSSSSSSSSSK..',
    '.KKKKKKKKKKKKK..',
    '................',
    '................',
  ],
  edelweiss: [
    '................',
    '......KKK.......',
    '.....KEEEK......',
    '..KK.KEEEK.KK...',
    '.KEEKKEEEKKEEK..',
    '.KEEEKEEEKEEEK..',
    '..KEEEKYKEEEK...',
    '.KKKKKYYYKKKKK..',
    'KEEEEYYOYYEEEEK.',
    '.KKKKKYYYKKKKK..',
    '..KEEEKYKEEEK...',
    '.KEEEKKGKKEEEK..',
    '.KEEK.KGK.KEEK..',
    '..KK..KGK..KK...',
    '......KGK.......',
    '......KKK.......',
  ],
  fog: [
    '................',
    '................',
    '................',
    '.....KKKK.......',
    '....KWWWWK.KKK..',
    '..KKWWWWWWKWWWK.',
    '.KWWWWWAAWWWWWK.',
    '.KWAAWWWWWWAAWK.',
    'KAAAAAAAAAAAAAAK',
    '.KKKKKKKKKKKKKK.',
    '................',
    '..AAAAAAAAAAA...',
    '................',
    '....AAAAAAAAAAA.',
    '................',
    '................',
  ],
};

// ── Scene props ───────────────────────────────────────────────────────────────────

export const PINE: Sprite = [
  '....K....',
  '...KGK...',
  '..KGGGK..',
  '...KGK...',
  '..KGGGK..',
  '.KGGHGGK.',
  '..KGGGK..',
  '.KGGGHGK.',
  'KGHGGGGGK',
  '.KGGGGHK.',
  'KGGGHGGGK',
  'KKKKTKKKK',
  '....T....',
  '....T....',
];

export const PINE_FAR: Sprite = [
  '..H..',
  '.HHH.',
  '..H..',
  '.HHH.',
  'HHHHH',
  '.HHH.',
  'HHHHH',
  '..T..',
];

export const ROCK: Sprite = ['..KKKK..', '.KBBABK.', 'KBBBBBAK', 'KBABBBBK', 'KKKKKKKK'];

export const TENT: Sprite = [
  '.........KKKKKK.........',
  '.......KKOOOOOOKK.......',
  '.....KKOOOOKOOOOOKK.....',
  '....KOOOOOOKOOOOOOOK....',
  '...KOOOOOOOKOOOOOOOOK...',
  '..KOOOOOOOKKKOOOOOOOOK..',
  '..KOOOOOOKKKKKOOOOOOOK..',
  '.KOOOOOOKKKKKKKOOOOOOOK.',
  '.KOOOOOKKKKKKKKKOOOOOOK.',
  'KOOOOOOKKKKKKKKKOOOOOOOK',
  'KOOOOOOKKKKKKKKKOOOOOOOK',
  'KKKKKKKKKKKKKKKKKKKKKKKK',
];

/** Checkpoint post (papan pos). */
export const SIGN: Sprite = [
  'KKKKKKKKKKKKKK',
  'KBBBBBBBBBBBBK',
  'KBTTTBTTBTTTBK',
  'KBBBBBBBBBBBBK',
  'KBTTBTTTTBTTBK',
  'KBBBBBBBBBBBBK',
  'KKKKKKKKKKKKKK',
  '......KTK.....',
  '......KTK.....',
  '......KTK.....',
  '......KTK.....',
  '.....KKKKK....',
];

/** Red-and-white flag on a pole. */
export const FLAG: Sprite = [
  'KK..........',
  'KAKKKKKKKKK.',
  'KAKRRRRRRRRK',
  'KAKRRRRRRRRK',
  'KAKRRRRRRRRK',
  'KAKWWWWWWWWK',
  'KAKWWWWWWWWK',
  'KAKWWWWWWWWK',
  'KAKKKKKKKKKK',
  'KAK.........',
  'KAK.........',
  'KAK.........',
  'KAK.........',
  'KAK.........',
  'KAK.........',
  'KAK.........',
];

/** Red-and-white flag waving on a pole held up by the hiker (kibar bendera), 4 frames. */
export const FLAG_WAVE: readonly Sprite[] = [
  ['KKKKKKKKK..', 'KRRRRRRRRK.', 'KRRRRRRRRK.', 'KWWWWWWWWK.', 'KWWWWWWWWK.', 'KKKKKKKKK..'],
  ['KKKKKKKK...', 'KRRRRRRRKK.', 'KRRRRRRRRRK', 'KWWWWWWWWWK', 'KWWWWWWWKK.', 'KKKKKKKK...'],
  ['KKKKKKK.KK.', 'KRRRRRRKRRK', 'KRRRRRRRRRK', 'KWWWWWWWWWK', 'KWWWWWWKWWK', 'KKKKKKK.KK.'],
  ['KKKKKKKKKK.', 'KRRRRRRRRK.', 'KRRRRRRRRRK', 'KWWWWWWWWWK', 'KWWWWWWWWK.', 'KKKKKKKKKK.'],
];

/** Low shrubs above the forest line (zona semak). */
export const SHRUB: Sprite = [
  '...KKK....',
  '..KGGGKKK.',
  '.KGMGGGGGK',
  'KGGGGHGGGK',
  'KHGGGGGHGK',
  '.KKKKKKKK.',
];

/** Cantigi: small twisted tree near the summit zone. */
export const CANTIGI: Sprite = [
  '..KKK...',
  '.KHHHKK.',
  'KHGHHHHK',
  '.KKHKKK.',
  '...TK...',
  '..KT....',
  '..KT....',
];

/** Snow patch on high rock. */
export const SNOW: Sprite = ['..WWWW..', '.WWWWWWW', 'WWFFWWFW'];

const cards = new Map<string, Sprite>();

/** 48×32 collection card for a mountain (docs/04-art-ui.md §5.3). Same array for the same id. */
export function mountainCard(id: string, altitude: number): Sprite {
  const key = `${id}:${altitude}`;
  let card = cards.get(key);
  if (!card) {
    card = drawMountainCard(id, altitude);
    cards.set(key, card);
  }
  return card;
}

function drawMountainCard(id: string, altitude: number): Sprite {
  const W = 48;
  const H = 32;
  let seed = 0;
  for (const ch of id) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  const rand = (n: number) => {
    let x = Math.imul((seed ^ n) >>> 0, 0x9e3779b1);
    x ^= x >>> 15;
    return ((x >>> 0) % 1000) / 1000;
  };
  // Taller cards for higher mountains; a lumpy profile seeded by the id.
  const peakH = 8 + Math.round(Math.min(1, altitude / 4884) * 16);
  const peakX = 14 + Math.floor(rand(1) * 20);
  const rows: string[][] = Array.from({ length: H }, (_, y) =>
    Array.from({ length: W }, () => (y < 18 ? 'F' : 'Y')),
  );
  const ground = H - 4;
  for (let x = 1; x < W - 1; x++) {
    const d = Math.abs(x - peakX);
    const lump = Math.round(rand(x) * 2);
    const h = Math.max(0, peakH - Math.round(d * (0.7 + rand(7) * 0.4)) - lump);
    for (let y = ground - h; y < ground; y++) {
      const snow =
        altitude >= 3000 && y < ground - h + Math.max(1, Math.round(h * 0.25)) && h > peakH * 0.6;
      rows[y]![x] = snow ? 'W' : x > peakX ? 'L' : 'S';
    }
  }
  for (let y = ground; y < H; y++)
    for (let x = 0; x < W; x++) rows[y]![x] = y === ground ? 'G' : 'H';
  // Sun and frame.
  rows[4]![40] = rows[4]![41] = rows[5]![40] = rows[5]![41] = 'E';
  for (let x = 0; x < W; x++) rows[0]![x] = rows[H - 1]![x] = 'K';
  for (let y = 0; y < H; y++) rows[y]![0] = rows[y]![W - 1] = 'K';
  return rows.map((r) => r.join(''));
}

export const CLOUD: Sprite = [
  '.......WWWW.............',
  '.....WWWWWWWW...WWW.....',
  '..WWWWWWWWWWWWWWWWWWW...',
  'WWWWWWWWWWWWWWWWWWWWWWWW',
  '..FFFFFFFFFFFFFFFFFFFF..',
];
