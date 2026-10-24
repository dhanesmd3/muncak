// Short chiptune effects, synthesized with WebAudio (docs/02-game-design.md §7,
// docs/04-art-ui.md §5.4). Everything is silent unless enabled in settings.
import type { Tier } from '../game/types';

type Wave = OscillatorType;

let ctx: AudioContext | null = null;
let soundOn = true;
let musicOn = false;
let musicTimer: ReturnType<typeof setInterval> | null = null;

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!ctx) {
      const AC =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, start: number, dur: number, wave: Wave = 'square', vol = 0.06) {
  const a = audio();
  if (!a) return;
  const t0 = a.currentTime + start;
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.type = wave;
  osc.frequency.setValueAtTime(freq, t0);
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(a.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function slide(from: number, to: number, dur: number, wave: Wave = 'triangle', vol = 0.06) {
  const a = audio();
  if (!a) return;
  const t0 = a.currentTime;
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.type = wave;
  osc.frequency.setValueAtTime(from, t0);
  osc.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(a.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

/** Call from a user gesture so mobile browsers allow audio later on. */
export function unlockAudio(): void {
  if (soundOn || musicOn) audio();
}

export function setSound(on: boolean): void {
  soundOn = on;
}

// Notes rise with rarity: rarer answers sound higher.
const TIER_ROOT: Record<Tier, number> = {
  basecamp: 392,
  camp: 440,
  treeline: 523,
  summit: 659,
  edelweiss: 784,
};

export const sfx = {
  accepted(tier: Tier) {
    if (!soundOn) return;
    const f = TIER_ROOT[tier];
    tone(f, 0, 0.1);
    tone(f * 1.25, 0.08, 0.1);
    tone(f * 1.5, 0.16, tier === 'basecamp' ? 0.1 : 0.22);
  },
  wrong() {
    if (!soundOn) return;
    tone(147, 0, 0.15, 'sawtooth', 0.05);
  },
  tick() {
    if (!soundOn) return;
    tone(988, 0, 0.06, 'square', 0.035);
  },
  edelweiss() {
    if (!soundOn) return;
    [784, 988, 1175, 1568, 1319, 1568].forEach((f, i) =>
      tone(f, i * 0.13, i === 5 ? 0.45 : 0.14, 'square', 0.05),
    );
  },
  checkpoint() {
    if (!soundOn) return;
    tone(523, 0, 0.12, 'triangle', 0.08);
    tone(659, 0.12, 0.12, 'triangle', 0.08);
    tone(784, 0.24, 0.26, 'triangle', 0.08);
  },
  fog() {
    if (!soundOn) return;
    slide(440, 110, 0.6, 'triangle', 0.07);
  },
};

// A gentle looping arpeggio. Off by default.
const MUSIC = [262, 330, 392, 523, 392, 330, 294, 349, 440, 587, 440, 349];
export function setMusic(on: boolean): void {
  musicOn = on;
  if (musicTimer !== null) {
    clearInterval(musicTimer);
    musicTimer = null;
  }
  if (!on) return;
  let i = 0;
  musicTimer = setInterval(() => {
    if (document.visibilityState !== 'visible') return;
    tone(MUSIC[i % MUSIC.length]!, 0, 0.28, 'triangle', 0.025);
    i++;
  }, 320);
}

export function vibrate(pattern: number | number[]): void {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // not supported
  }
}
