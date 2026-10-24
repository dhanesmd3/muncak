import { useCallback, useEffect, useState } from 'preact/hooks';
import { DAILY_RETRY_MS } from '../game/constants';
import { dailyPath, parseDailyFile } from '../game/daily';
import { DEFAULT_PAYLOAD_KEY } from '../game/payload';
import type { DailyPayload } from '../game/types';

export type DailyLoad =
  | { status: 'loading' }
  | { status: 'ready'; payload: DailyPayload }
  | { status: 'missing' } // not published yet (late deploy)
  | { status: 'error' }; // network or bad file

const KEY = import.meta.env.VITE_PAYLOAD_KEY || DEFAULT_PAYLOAD_KEY;

async function fetchDaily(date: string): Promise<DailyLoad> {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}${dailyPath(date)}`, {
      cache: 'no-cache',
    });
    // A host that falls back to index.html for unknown paths also means "not published".
    const isHtml = (res.headers.get('content-type') ?? '').includes('text/html');
    if (res.status === 404 || (res.ok && isHtml)) return { status: 'missing' };
    if (!res.ok) return { status: 'error' };
    return { status: 'ready', payload: parseDailyFile(await res.text(), KEY, date) };
  } catch {
    return { status: 'error' };
  }
}

/** Load the payload for `date` (WIB). Retries every 60 s until it is available. */
export function useDaily(date: string): DailyLoad & { retry: () => void } {
  const [load, setLoad] = useState<DailyLoad>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    void fetchDaily(date).then((result) => {
      if (!alive) return;
      setLoad(result);
      if (result.status !== 'ready') {
        timer = setTimeout(() => setAttempt((n) => n + 1), DAILY_RETRY_MS);
      }
    });
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [date, attempt]);

  useEffect(() => {
    setLoad({ status: 'loading' });
  }, [date]);

  const retry = useCallback(() => {
    setLoad({ status: 'loading' });
    setAttempt((n) => n + 1);
  }, []);
  return { ...load, retry };
}
