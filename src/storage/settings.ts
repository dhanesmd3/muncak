import { KEYS, readJson, writeJson } from './storage';

export interface Settings {
  sound: boolean;
  music: boolean;
  vibrate: boolean;
  reducedMotion: boolean;
  highContrast: boolean;
  onboarded: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  sound: true,
  music: false, // background music is off by default (docs/02-game-design.md §7)
  vibrate: true,
  reducedMotion: false,
  highContrast: false,
  onboarded: false,
};

export function loadSettings(): Settings {
  const saved = readJson<Partial<Settings>>(KEYS.settings);
  const out = { ...DEFAULT_SETTINGS };
  if (saved && typeof saved === 'object') {
    for (const k of Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]) {
      if (typeof saved[k] === 'boolean') out[k] = saved[k];
    }
  }
  return out;
}

export function saveSettings(settings: Settings): void {
  writeJson(KEYS.settings, settings);
}
