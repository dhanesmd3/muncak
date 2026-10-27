// Sends a finished Muncak Harian to the server once, retrying later when offline.
import type { PlayRequest } from '../game/play';
import { loadPendingPlay, savePendingPlay } from '../storage/modes';
import { API_ENABLED, ApiError, api } from './client';

let inFlight: Promise<void> | null = null;

/** Try to deliver the pending play. Network/server errors keep it for the next attempt. */
export function flushPendingPlay(): Promise<void> {
  if (!API_ENABLED) return Promise.resolve();
  if (inFlight) return inFlight;
  const play = loadPendingPlay();
  if (!play) return Promise.resolve();
  inFlight = api
    .postPlay(play)
    .then(() => savePendingPlay(null))
    .catch((e: unknown) => {
      // 4xx (already played, too old, mismatch) will never succeed: drop it.
      if (e instanceof ApiError && e.status >= 400 && e.status < 500 && e.status !== 429) {
        savePendingPlay(null);
      }
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

export function submitDailyPlay(play: PlayRequest): Promise<void> {
  if (!API_ENABLED) return Promise.resolve();
  savePendingPlay(play);
  return flushPendingPlay();
}

/** Fire-and-forget logging for Ekspedisi / Paket Tema (no retry, no score). */
export function logModePlay(play: PlayRequest): void {
  if (!API_ENABLED || play.rounds.length === 0) return;
  void api.postPlay(play).catch(() => undefined);
}
