// Share text and the share fallback chain: Web Share API → wa.me link → clipboard.
// docs/02-game-design.md §3.1. The text never contains answers.
import type { Outcome } from '../game/types';
import { formatNumber, t, tierEmoji } from '../i18n/id';

export interface ShareInput {
  dayNumber: number;
  altitude: number;
  mountainShortName: string;
  outcomes: readonly Outcome[];
  url: string;
}

export function shareText(s: ShareInput): string {
  return [
    t.result.shareTitle(s.dayNumber),
    `${formatNumber(s.altitude)} mdpl · ${s.mountainShortName}`,
    s.outcomes.map((o) => tierEmoji[o]).join(''),
    s.url,
  ].join('\n');
}

export type ShareOutcome = 'shared' | 'whatsapp' | 'copied' | 'cancelled' | 'failed';

export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the legacy path
  }
  try {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    return ok;
  } catch {
    return false;
  }
}

export async function shareResult(text: string): Promise<ShareOutcome> {
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ text });
      return 'shared';
    } catch (e) {
      if ((e as DOMException)?.name === 'AbortError') return 'cancelled';
      // Otherwise fall back to WhatsApp.
    }
  }
  try {
    // No 'noopener' feature here: with it, window.open always returns null.
    const win = window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    if (win) {
      win.opener = null;
      return 'whatsapp';
    }
  } catch {
    // fall back to the clipboard
  }
  return (await copyText(text)) ? 'copied' : 'failed';
}
