// Scene palettes per part of the day (docs/04-art-ui.md §5.2, layer 7). Every color is
// one of the 16 "Kabut Pagi" colors; night and evening only rearrange them.
import type { TimeOfDay } from '../game/date';
import { PALETTE as P } from './palette';

/** Sky band: from row `y`, blend (dithered) from color `a` to `b` until the next band. */
export type SkyBand = [y: number, a: string, b: string];

export interface SceneTheme {
  sky: SkyBand[];
  /** Sun or moon: outer ring and inner disc. */
  light: { x: number; y: number; outer: string; inner: string; moon: boolean };
  stars: boolean;
  ridgeBack: string;
  ridgeFront: string;
  snow: string;
  fogBand: string;
  /** Recolor for the environment (ground, trees, rocks, clouds). The hiker keeps its colors. */
  recolor: Readonly<Record<string, string>>;
}

export const THEMES: Record<TimeOfDay, SceneTheme> = {
  // Kabut Pagi: the original morning scene.
  morning: {
    sky: [
      [0, P.langit, P.langit],
      [20, P.langit, P.kabut],
      [28, P.kabut, P.kabut],
      [56, P.kabut, P.mentari],
      [64, P.mentari, P.mentari],
    ],
    light: { x: 142, y: 30, outer: P.mentari, inner: P.edelweiss, moon: false },
    stars: false,
    ridgeBack: P.langit,
    ridgeFront: P.lembah,
    snow: P.awan,
    fogBand: P.awan,
    recolor: {},
  },
  // Bright midday: high sun, no warm horizon.
  day: {
    sky: [
      [0, P.langit, P.langit],
      [30, P.langit, P.kabut],
      [44, P.kabut, P.kabut],
    ],
    light: { x: 150, y: 14, outer: P.mentari, inner: P.edelweiss, moon: false },
    stars: false,
    ridgeBack: P.langit,
    ridgeFront: P.lembah,
    snow: P.awan,
    fogBand: P.awan,
    recolor: {},
  },
  // Sunset: warm sky, low sun in the west.
  evening: {
    sky: [
      [0, P.lembah, P.lembah],
      [10, P.lembah, P.langit],
      [20, P.langit, P.senja],
      [42, P.senja, P.senja],
      [52, P.senja, P.mentari],
      [62, P.mentari, P.mentari],
    ],
    light: { x: 38, y: 50, outer: P.senja, inner: P.mentari, moon: false },
    stars: false,
    ridgeBack: P.lembah,
    ridgeFront: P.malam,
    snow: P.mentari,
    fogBand: P.mentari,
    recolor: { [P.awan]: P.mentari, [P.kabut]: P.senja, [P.lumut]: P.daun },
  },
  // Night: dark sky, moon and stars, everything on the ground one step darker.
  night: {
    // Brighter horizon, so the ridges read as dark silhouettes against it.
    sky: [
      [0, P.malam, P.malam],
      [22, P.malam, P.lembah],
      [36, P.lembah, P.langit],
      [50, P.langit, P.langit],
    ],
    light: { x: 138, y: 22, outer: P.kabut, inner: P.awan, moon: true },
    stars: true,
    ridgeBack: P.lembah,
    ridgeFront: P.malam,
    snow: P.kabut,
    fogBand: P.abu,
    recolor: {
      [P.daun]: P.hutan,
      [P.lumut]: P.daun,
      [P.hutan]: P.malam,
      [P.batu]: P.tanah,
      [P.abu]: P.lembah,
      [P.awan]: P.abu,
      [P.kabut]: P.lembah,
    },
  },
};

export const tint = (theme: SceneTheme, color: string): string => theme.recolor[color] ?? color;
