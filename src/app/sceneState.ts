import { altitude, totalPoints } from '../game/scoring';
import type { DailyState, Outcome } from '../game/types';
import type { RestPose, SceneState } from '../scene/scene';

/** Puncak Jaya; reaching it plants and waves the flag. */
export const CARTENZ_ALTITUDE = 4884;

export function baseScene(reducedMotion: boolean): SceneState {
  return { altitude: 0, pose: 'idle', fog: false, edelweiss: false, flag: false, reducedMotion };
}

/** Rest pose after an accepted answer or a timeout (docs/04-art-ui.md §5.1). */
export function poseFor(outcome: Outcome): RestPose {
  if (outcome === 'fog') return 'cold';
  if (outcome === 'edelweiss') return 'photo';
  if (outcome === 'summit') return 'jump';
  return 'idle';
}

/** Scene for a Harian or Paket Tema session. */
export function sessionScene(st: DailyState, reducedMotion: boolean): SceneState {
  const alt = altitude(totalPoints(st.rounds));
  const scene = { ...baseScene(reducedMotion), altitude: alt };
  if (st.phase === 'reveal') {
    const outcome = st.rounds[st.current]!.result!.outcome;
    return {
      ...scene,
      pose: poseFor(outcome),
      fog: outcome === 'fog',
      edelweiss: outcome === 'edelweiss',
    };
  }
  if (st.phase === 'finished') {
    return { ...scene, pose: alt >= CARTENZ_ALTITUDE ? 'wave' : 'jump', flag: true };
  }
  return scene;
}
