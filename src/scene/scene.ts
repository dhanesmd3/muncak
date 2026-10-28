// Pixel scene: 180×120 logical px, parallax layers, a hiker that climbs with the score.
// docs/04-art-ui.md §2, §5, §7.
import type { TimeOfDay } from '../game/date';
import type { Mountain } from '../game/types';
import { PALETTE, PIXEL_KEY } from './palette';
import {
  CANTIGI,
  CLOUD,
  FLAG,
  FLAG_WAVE,
  HIKER_ANIMS,
  HIKER_H,
  PINE,
  PINE_FAR,
  ROCK,
  SHRUB,
  SIGN,
  SNOW,
  TENT,
  TIER_ICONS,
  hikerFrame,
  hikerLift,
  type HikerAnim,
  type Sprite,
} from './sprites';
import { THEMES, tint, type SceneTheme } from './themes';

export const SCENE_W = 180;
export const SCENE_H = 120;

/** Trail pixels per metre of altitude. */
const PX_PER_M = 0.2;
const SLOPE = 0.35;
const HIKER_X = 70; // screen x of the hiker's feet
const HIKER_FOOT_Y = 96;
const MAX_ALTITUDE = 4900;
const FRAME_MS = 1000 / 30;
const FOG_LEVELS = 8;

/** idle · jump (Puncak) · photo (Edelweiss) · cold (Kabut) · wave (flag at Cartenz). */
export type RestPose = 'idle' | 'jump' | 'cold' | 'photo' | 'wave';

/** Vegetation zone at an altitude (docs/04-art-ui.md §5.2: hutan → semak → batu → puncak). */
export type Zone = 'forest' | 'shrub' | 'rock' | 'peak';
export function zoneAt(altitude: number): Zone {
  if (altitude < 2000) return 'forest';
  if (altitude < 3000) return 'shrub';
  if (altitude < 4000) return 'rock';
  return 'peak';
}

export interface SceneState {
  altitude: number;
  pose: RestPose;
  fog: boolean;
  edelweiss: boolean;
  flag: boolean;
  reducedMotion: boolean;
  /** Sky and colors by WIB hour (docs/04-art-ui.md §5.2, layer 7). Default: morning. */
  timeOfDay?: TimeOfDay;
}

/** Climb tween length: 800–1.500 ms, longer for bigger climbs (docs/04-art-ui.md §7). */
export function climbDurationMs(deltaMeters: number): number {
  return Math.round(800 + 700 * Math.min(1, Math.max(0, deltaMeters) / 700));
}

const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

/** Deterministic pseudo-random number in [0, 1) for an integer cell. */
function hash(n: number): number {
  let x = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}

/** 4×4 Bayer matrix for ordered dithering (keeps every pixel inside the palette). */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
const dither = (x: number, y: number) => BAYER[(y & 3) * 4 + (x & 3)]!;

const groundY = (sx: number) => HIKER_FOOT_Y - (sx - HIKER_X) * SLOPE;
const frontRidge = (wx: number) => 12 + 5 * Math.sin(wx * 0.045 + 2) + 3 * Math.sin(wx * 0.11);

type Ctx = CanvasRenderingContext2D;

export class Scene {
  private ctx: Ctx;
  private state: SceneState = {
    altitude: 0,
    pose: 'idle',
    fog: false,
    edelweiss: false,
    flag: false,
    reducedMotion: false,
  };
  private cam = 0; // current camera altitude (m)
  private tween: { from: number; to: number; start: number; duration: number } | null = null;
  private poseSince = 0;
  private fogSince = 0;
  private edelweissSince = 0;
  private raf = 0;
  private lastDraw = 0;
  private started = false;
  /** Sprite canvases per theme ('' = original colors, used for the hiker and effects). */
  private sprites = new Map<string, Map<Sprite, HTMLCanvasElement>>();
  private layers = new Map<string, HTMLCanvasElement>();
  private hikerFrames = new Map<string, Sprite>();

  constructor(
    canvas: HTMLCanvasElement,
    private mountains: readonly Mountain[],
  ) {
    canvas.width = SCENE_W;
    canvas.height = SCENE_H;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D not available');
    ctx.imageSmoothingEnabled = false;
    this.ctx = ctx;
  }

  /** Update what the scene shows. The first call snaps the camera instead of climbing. */
  set(next: SceneState, now = performance.now()): void {
    const prev = this.state;
    this.state = next;
    if (!this.started || next.reducedMotion) {
      this.cam = next.altitude;
      this.tween = null;
    } else if (next.altitude !== prev.altitude) {
      this.tween = {
        from: this.cam,
        to: next.altitude,
        start: now,
        duration: climbDurationMs(Math.abs(next.altitude - this.cam)),
      };
    }
    if (next.pose !== prev.pose || next.altitude !== prev.altitude) this.poseSince = now;
    if (next.fog && !prev.fog) this.fogSince = now;
    if (next.edelweiss && !prev.edelweiss) this.edelweissSince = now;
    this.started = true;
    this.draw(now);
  }

  start(): void {
    const loop = (now: number) => {
      this.raf = requestAnimationFrame(loop);
      if (now - this.lastDraw >= FRAME_MS) this.draw(now);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop(): void {
    cancelAnimationFrame(this.raf);
  }

  /** Paint a full-size static layer once and reuse it. */
  private layer(key: string, paint: (ctx: Ctx) => void): HTMLCanvasElement {
    let c = this.layers.get(key);
    if (!c) {
      c = document.createElement('canvas');
      c.width = SCENE_W;
      c.height = SCENE_H;
      paint(c.getContext('2d')!);
      this.layers.set(key, c);
    }
    return c;
  }

  private get timeOfDay(): TimeOfDay {
    return this.state.timeOfDay ?? 'morning';
  }

  private get theme(): SceneTheme {
    return THEMES[this.timeOfDay];
  }

  private sprite(s: Sprite, themed: boolean): HTMLCanvasElement {
    const key = themed ? this.timeOfDay : '';
    let cache = this.sprites.get(key);
    if (!cache) {
      cache = new Map();
      this.sprites.set(key, cache);
    }
    let c = cache.get(s);
    if (!c) {
      const theme = this.theme;
      c = document.createElement('canvas');
      c.width = s[0]!.length;
      c.height = s.length;
      const ctx = c.getContext('2d')!;
      s.forEach((row, y) => {
        for (let x = 0; x < row.length; x++) {
          const color = PIXEL_KEY[row[x]!];
          if (!color) continue;
          ctx.fillStyle = themed ? tint(theme, color) : color;
          ctx.fillRect(x, y, 1, 1);
        }
      });
      cache.set(s, c);
    }
    return c;
  }

  /** Draw an environment sprite, recolored for the time of day. */
  private blit(s: Sprite, x: number, y: number): void {
    this.ctx.drawImage(this.sprite(s, true), Math.round(x), Math.round(y));
  }

  /** Draw a sprite in its own colors (hiker, flag, Edelweiss stay readable at night). */
  private blitPlain(s: Sprite, x: number, y: number): void {
    this.ctx.drawImage(this.sprite(s, false), Math.round(x), Math.round(y));
  }

  private hiker(anim: HikerAnim, frame: number): Sprite {
    const key = `${anim}:${frame}`;
    let s = this.hikerFrames.get(key);
    if (!s) {
      s = hikerFrame(anim, frame);
      this.hikerFrames.set(key, s);
    }
    return s;
  }

  draw(now: number): void {
    this.lastDraw = now;
    const st = this.state;
    const still = st.reducedMotion;

    if (this.tween) {
      const t = Math.min(1, (now - this.tween.start) / this.tween.duration);
      this.cam = this.tween.from + (this.tween.to - this.tween.from) * easeInOut(t);
      if (t >= 1) {
        this.tween = null;
        this.poseSince = now;
      }
    }

    const s = this.cam * PX_PER_M; // distance walked along the trail, in px
    const sink = Math.min(1, this.cam / MAX_ALTITUDE) * 40; // other ranges sit lower as we climb

    const theme = this.theme;
    this.ctx.drawImage(
      this.layer(`sky:${this.timeOfDay}`, (ctx) => paintSky(ctx, theme)),
      0,
      0,
    );
    this.drawClouds(s, still ? 0 : now);
    this.drawFarMountains(s, sink);
    this.drawFogBand(s, sink, still ? 0 : now);
    this.drawGround(s);

    // Hiker: walking while the camera climbs, otherwise the rest pose.
    const anim: HikerAnim = this.tween ? 'walk' : restAnim(st.pose, now - this.poseSince);
    const meta = HIKER_ANIMS[anim];
    const frame = still ? 0 : Math.floor(((now - this.poseSince) / 1000) * meta.fps) % meta.frames;
    const hy = HIKER_FOOT_Y - HIKER_H + 1 - hikerLift(anim, frame);
    this.blitPlain(this.hiker(anim, frame), HIKER_X - 9, hy);
    if (anim === 'wave') {
      // Pole from the raised hand, flag cloth waving at the top.
      this.ctx.fillStyle = PALETTE.abu;
      this.ctx.fillRect(HIKER_X + 5, hy - 12, 1, 13);
      this.blitPlain(FLAG_WAVE[frame % FLAG_WAVE.length]!, HIKER_X + 6, hy - 12);
    }

    if (st.flag && !this.tween && anim !== 'wave') {
      this.blitPlain(FLAG, HIKER_X + 10, groundY(HIKER_X + 11) - 16);
    }
    if (st.edelweiss && !this.tween) this.drawEdelweiss(now, still);
    this.drawForeground(s);
    if (st.fog) {
      const amount = still ? 1 : Math.min(1, (now - this.fogSince) / 800);
      const level = Math.round(amount * FOG_LEVELS);
      if (level > 0) {
        this.ctx.drawImage(
          this.layer(`fog${level}`, (ctx) => paintFog(ctx, level / FOG_LEVELS)),
          0,
          0,
        );
      }
    }
  }

  private drawClouds(s: number, now: number): void {
    const span = SCENE_W + 40;
    const drift = now * 0.002;
    for (let i = 0; i < 3; i++) {
      const base = i * 73 + 10;
      const x = ((((base - s * 0.1 - drift * (1 + i * 0.3)) % span) + span) % span) - 30;
      this.blit(CLOUD, x, 8 + i * 9);
    }
  }

  private drawFarMountains(s: number, sink: number): void {
    const ctx = this.ctx;
    const theme = this.theme;
    for (let x = 0; x < SCENE_W; x++) {
      const wx = x + s * 0.2;
      const back =
        24 + 9 * Math.sin(wx * 0.031) + 6 * Math.sin(wx * 0.083 + 1) + 2 * Math.sin(wx * 0.21);
      const yb = Math.round(80 + sink - back);
      ctx.fillStyle = theme.ridgeBack;
      ctx.fillRect(x, yb, 1, SCENE_H - yb);
      if (back > 33) {
        // Snow on the highest crests.
        ctx.fillStyle = theme.snow;
        ctx.fillRect(x, yb, 1, Math.min(3, Math.round(back - 33)));
      }
      const yf = Math.round(90 + sink - frontRidge(x + s * 0.3));
      ctx.fillStyle = theme.ridgeFront;
      ctx.fillRect(x, yf, 1, SCENE_H - yf);
    }
    // Distant pines along the front ridge.
    const off = s * 0.3;
    for (let cell = Math.floor(off / 9) - 1; cell < (off + SCENE_W) / 9 + 1; cell++) {
      if (hash(cell * 7 + 3) > 0.55) continue;
      const x = cell * 9 - off + hash(cell) * 4;
      this.blit(PINE_FAR, x, 90 + sink - frontRidge(x + off) - 6);
    }
  }

  private drawFogBand(s: number, sink: number, now: number): void {
    const ctx = this.ctx;
    ctx.fillStyle = this.theme.fogBand;
    const off = s * 0.4 + now * 0.004;
    for (let x = 0; x < SCENE_W; x++) {
      const top = Math.round(78 + sink + 3 * Math.sin((x + off) * 0.06));
      for (let y = top; y < top + 10 && y < SCENE_H; y++) {
        const density = 0.55 - Math.abs(y - top - 5) * 0.1;
        if (dither(x, y) < density) ctx.fillRect(x, y, 1, 1);
      }
    }
  }

  private drawGround(s: number): void {
    const ctx = this.ctx;
    const theme = this.theme;
    // Vegetation behind the trail changes with the altitude at that spot.
    for (let cell = Math.floor((s - HIKER_X) / 10) - 2; cell < (s + SCENE_W) / 10 + 2; cell++) {
      const r = hash(cell);
      const zone = zoneAt((cell * 10) / PX_PER_M);
      const density =
        zone === 'forest' ? 0.45 : zone === 'shrub' ? 0.5 : zone === 'rock' ? 0.3 : 0.35;
      if (r > density) continue;
      const sx = cell * 10 - s + HIKER_X + hash(cell + 999) * 5;
      if (Math.abs(sx + 4 - HIKER_X) < 10) continue; // keep the hiker visible
      const pick = hash(cell + 77);
      const y = groundY(sx + 4);
      if (zone === 'forest' || (zone === 'shrub' && pick < 0.3)) {
        this.blit(PINE, sx, y - 14 - Math.round(r * 10));
      } else if (zone === 'shrub') {
        this.blit(SHRUB, sx, y - 6 - Math.round(r * 6));
      } else if (zone === 'rock') {
        this.blit(pick < 0.5 ? CANTIGI : ROCK, sx, y - 7 - Math.round(r * 8));
      } else {
        this.blit(pick < 0.5 ? SNOW : ROCK, sx, y - 4 - Math.round(r * 8));
      }
    }
    // Basecamp tent, and one post (papan pos) per checkpoint mountain.
    const tentX = -46 - s + HIKER_X;
    if (tentX > -30 && tentX < SCENE_W) this.blit(TENT, tentX, groundY(tentX + 12) - 13);
    for (const m of this.mountains) {
      if (m.altitude <= 0) continue;
      const sx = m.altitude * PX_PER_M - s + HIKER_X + 12;
      if (sx < -16 || sx > SCENE_W) continue;
      this.blit(SIGN, sx, groundY(sx + 7) - 12);
    }

    for (let x = 0; x < SCENE_W; x++) {
      const gy = Math.round(groundY(x));
      if (gy >= SCENE_H) continue;
      // Ground colors follow the zone: grass, then bare rock, then snow near the top.
      const wx = Math.floor(x + s);
      const zone = zoneAt((x - HIKER_X + s) / PX_PER_M);
      const [edge, fill, texture] =
        zone === 'forest' || zone === 'shrub'
          ? [PALETTE.lumut, PALETTE.daun, PALETTE.hutan]
          : zone === 'rock'
            ? [PALETTE.batu, PALETTE.batu, PALETTE.tanah]
            : [PALETTE.awan, PALETTE.abu, PALETTE.awan];
      ctx.fillStyle = tint(theme, edge);
      ctx.fillRect(x, gy - 1, 1, 1);
      ctx.fillStyle = tint(theme, PALETTE.tanah);
      ctx.fillRect(x, gy, 1, 3);
      ctx.fillStyle = tint(theme, fill);
      ctx.fillRect(x, gy + 3, 1, SCENE_H - gy - 3);
      // Texture anchored to the world so it scrolls with the trail.
      ctx.fillStyle = tint(theme, texture);
      for (let y = gy + 5; y < SCENE_H; y += 4) {
        if (hash(wx * 131 + y) < 0.12) ctx.fillRect(x, y, 1, 2);
      }
    }
  }

  private drawForeground(s: number): void {
    for (let cell = Math.floor(s / 14) - 1; cell < (s + SCENE_W) / 14 + 1; cell++) {
      if (hash(cell * 3 + 1) > 0.3) continue;
      const sx = cell * 14 - s + hash(cell * 5) * 6;
      this.blit(ROCK, sx, groundY(sx + 4) + 6 + Math.round(hash(cell * 11) * 6));
    }
  }

  private drawEdelweiss(now: number, still: boolean): void {
    const ctx = this.ctx;
    this.blitPlain(TIER_ICONS.edelweiss, HIKER_X + 6, groundY(HIKER_X + 14) - 10);
    const t = now - this.edelweissSince;
    if (still || t > 1500) return;
    // Sparkles drifting around the hiker for 1.5 s.
    const frame = Math.floor(t / 120);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + frame * 0.3;
      const r = 14 + (frame % 4) * 3;
      const x = Math.round(HIKER_X + Math.cos(a) * r);
      const y = Math.round(HIKER_FOOT_Y - 14 + Math.sin(a) * r * 0.8 + (t / 1500) * 6);
      ctx.fillStyle = (i + frame) % 2 ? PALETTE.edelweiss : PALETTE.awan;
      ctx.fillRect(x, y, 1, 1);
      if ((i + frame) % 3 === 0) {
        ctx.fillRect(x - 1, y, 3, 1);
        ctx.fillRect(x, y - 1, 1, 3);
      }
    }
  }
}

function restAnim(pose: RestPose, sincePose: number): HikerAnim {
  if (pose === 'cold' || pose === 'wave') return pose;
  if ((pose === 'jump' || pose === 'photo') && sincePose < 1500) return pose;
  return 'idle';
}

function circle(ctx: Ctx, cx: number, cy: number, r: number): void {
  for (let y = -r; y <= r; y++) {
    const w = Math.floor(Math.sqrt(r * r - y * y));
    ctx.fillRect(cx - w, cy + y, w * 2 + 1, 1);
  }
}

/** Sky for the time of day: dithered bands, sun or moon, and stars at night. */
function paintSky(ctx: Ctx, theme: SceneTheme): void {
  const bands = theme.sky;
  for (let y = 0; y < SCENE_H; y++) {
    let i = bands.length - 1;
    while (i > 0 && bands[i]![0] > y) i--;
    const [y0, a, b] = bands[i]!;
    const y1 = bands[i + 1]?.[0] ?? SCENE_H;
    if (a === b) {
      ctx.fillStyle = a;
      ctx.fillRect(0, y, SCENE_W, 1);
      continue;
    }
    const t = (y - y0) / (y1 - y0);
    for (let x = 0; x < SCENE_W; x++) {
      ctx.fillStyle = dither(x, y) < t ? b : a;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  if (theme.stars) {
    // Fixed star field in the upper sky, one or two pixels each.
    for (let i = 0; i < 40; i++) {
      const x = Math.floor(hash(i * 17 + 5) * SCENE_W);
      const y = Math.floor(hash(i * 31 + 11) * 52);
      ctx.fillStyle = hash(i * 7) < 0.25 ? PALETTE.edelweiss : PALETTE.awan;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  const { x, y, outer, inner, moon } = theme.light;
  ctx.fillStyle = outer;
  circle(ctx, x, y, moon ? 7 : 9);
  ctx.fillStyle = inner;
  circle(ctx, x, y, moon ? 6 : 7);
  if (moon) {
    // Craters.
    ctx.fillStyle = PALETTE.kabut;
    ctx.fillRect(x - 2, y - 2, 2, 2);
    ctx.fillRect(x + 2, y + 1, 2, 1);
    ctx.fillRect(x - 1, y + 3, 1, 1);
  }
}

/** Thick fog covering the scene (Kabut result), ordered-dithered to stay in the palette. */
function paintFog(ctx: Ctx, amount: number): void {
  const density = amount * 0.7;
  for (let y = 0; y < SCENE_H; y++) {
    for (let x = 0; x < SCENE_W; x++) {
      const d = dither(x, y);
      if (d >= density) continue;
      ctx.fillStyle = d < density * 0.5 ? PALETTE.awan : PALETTE.abu;
      ctx.fillRect(x, y, 1, 1);
    }
  }
}
