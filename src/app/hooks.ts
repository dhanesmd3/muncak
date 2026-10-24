import { useEffect, useRef, useState } from 'preact/hooks';

/** True while the OS asks for reduced motion. */
export function usePrefersReducedMotion(): boolean {
  const query = '(prefers-reduced-motion: reduce)';
  const [reduced, setReduced] = useState(
    () => typeof matchMedia === 'function' && matchMedia(query).matches,
  );
  useEffect(() => {
    if (typeof matchMedia !== 'function') return;
    const mq = matchMedia(query);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);
  return reduced;
}

/** True while the on-screen keyboard takes a big part of the viewport (visualViewport). */
export function useKeyboardOpen(): boolean {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => setOpen(window.innerHeight - vv.height > 150);
    vv.addEventListener('resize', update);
    update();
    return () => vv.removeEventListener('resize', update);
  }, []);
  return open;
}

/** Animate a number towards `target`; `durationFor(delta)` gives the length in ms. */
export function useCountUp(
  target: number,
  durationFor: (delta: number) => number,
  instant: boolean,
): number {
  const [value, setValue] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    const start = from.current;
    if (instant || start === target) {
      from.current = target;
      setValue(target);
      return;
    }
    const t0 = performance.now();
    const duration = Math.max(1, durationFor(Math.abs(target - start)));
    let raf = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / duration);
      const v = Math.round(start + (target - start) * t);
      from.current = v;
      setValue(v);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, durationFor, instant]);
  return value;
}

/** Current time, refreshed every `intervalMs`. */
export function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
