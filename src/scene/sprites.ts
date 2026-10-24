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

export type HikerAnim = 'idle' | 'walk' | 'jump' | 'cold';

/** Frame count and speed per animation (docs/04-art-ui.md §5.1). */
export const HIKER_ANIMS: Record<HikerAnim, { frames: number; fps: number }> = {
  idle: { frames: 4, fps: 4 },
  walk: { frames: 6, fps: 10 },
  jump: { frames: 4, fps: 8 },
  cold: { frames: 3, fps: 6 },
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

export const CLOUD: Sprite = [
  '.......WWWW.............',
  '.....WWWWWWWW...WWW.....',
  '..WWWWWWWWWWWWWWWWWWW...',
  'WWWWWWWWWWWWWWWWWWWWWWWW',
  '..FFFFFFFFFFFFFFFFFFFF..',
];
