import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { useCountUp } from '../app/hooks';
import type { Mountain } from '../game/types';
import { t } from '../i18n/id';
import { SCENE_H, SCENE_W, Scene, climbDurationMs, type SceneState } from '../scene/scene';

interface Props {
  state: SceneState;
  mountains: readonly Mountain[];
  /** Show the altitude counter over the scene. */
  showAltitude: boolean;
  /** Keyboard is open: shrink the scene so the prompt and input stay visible. */
  compact: boolean;
}

const MAX_SCALE = 3;
const COMPACT_ROWS = 44; // logical rows kept around the hiker in compact mode

export function SceneView({ state, mountains, showAltitude, compact }: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const scene = useRef<Scene | null>(null);
  const [scale, setScale] = useState(2);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!canvas.current) return;
    try {
      const s = new Scene(canvas.current, mountains);
      scene.current = s;
      s.start();
      return () => s.stop();
    } catch {
      setFailed(true);
    }
  }, [mountains]);

  useEffect(() => {
    scene.current?.set(state);
  }, [state.altitude, state.pose, state.fog, state.edelweiss, state.flag, state.reducedMotion]);

  // Largest whole-number scale that fits the width (never 1.5×).
  useLayoutEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const update = () =>
      setScale(Math.max(1, Math.min(MAX_SCALE, Math.floor(el.clientWidth / SCENE_W))));
    update();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', update);
      return () => window.removeEventListener('resize', update);
    }
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const shown = useCountUp(state.altitude, climbDurationMs, state.reducedMotion);

  const height = (compact ? COMPACT_ROWS : SCENE_H) * scale;
  const offset = compact ? -(SCENE_H - COMPACT_ROWS - 20) * scale : 0;

  return (
    <div class="scene" ref={wrap} style={{ height: `${height}px` }} aria-hidden="true">
      {!failed && (
        <canvas
          ref={canvas}
          class="scene-canvas"
          width={SCENE_W}
          height={SCENE_H}
          style={{
            width: `${SCENE_W * scale}px`,
            height: `${SCENE_H * scale}px`,
            marginTop: `${offset}px`,
          }}
        />
      )}
      {showAltitude && <div class="scene-altitude">{t.mdpl(shown)}</div>}
    </div>
  );
}
