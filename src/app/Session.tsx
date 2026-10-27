import { createContext, type ComponentChildren } from 'preact';
import { useContext, useEffect, useMemo, useReducer, useRef } from 'preact/hooks';
import { sfx, vibrate } from '../audio/sfx';
import { createDailyReducer, restoreDailyState, type DailyAction } from '../game/reducer';
import { altitude, checkpointsPassed, totalPoints } from '../game/scoring';
import type { DailyPayload, DailyState, Mountain } from '../game/types';
import { climbDurationMs } from '../scene/scene';
import { KEYS, readJson, writeJson } from '../storage/storage';

export interface SessionValue {
  payload: DailyPayload;
  state: DailyState;
  dispatch: (action: DailyAction) => void;
}

const SessionContext = createContext<SessionValue | null>(null);

export function useSession(): SessionValue | null {
  return useContext(SessionContext);
}

/**
 * Sounds, vibration and the "finished" callback on round transitions. Shared by Muncak
 * Harian and Paket Tema, which use the same rounds.
 */
export function useRoundEffects(
  state: DailyState,
  mountains: readonly Mountain[],
  vibrateOn: boolean,
  onFinished: (state: DailyState) => void,
): void {
  const prev = useRef(state);
  useEffect(() => {
    const before = prev.current;
    prev.current = state;
    if (before === state) return;

    const round = state.rounds[state.current];
    const was = before.rounds[state.current];
    if (round && was) {
      const last = round.attempts[round.attempts.length - 1];
      if (round.attempts.length > was.attempts.length && last?.kind !== 'accepted') sfx.wrong();

      if (round.result && !was.result) {
        const outcome = round.result.outcome;
        if (outcome === 'fog') sfx.fog();
        else if (outcome === 'edelweiss') {
          sfx.edelweiss();
          if (vibrateOn) vibrate([80, 60, 120]);
        } else sfx.accepted(outcome);

        const to = altitude(totalPoints(state.rounds));
        const from = altitude(totalPoints(before.rounds));
        if (checkpointsPassed(from, to, mountains).length > 0) {
          setTimeout(() => sfx.checkpoint(), climbDurationMs(to - from));
        }
      }
    }
    if (state.phase === 'finished' && before.phase !== 'finished') onFinished(state);
  }, [state]);
}

interface Props {
  payload: DailyPayload;
  mountains: readonly Mountain[];
  vibrateOn: boolean;
  onFinished: (state: DailyState) => void;
  onPhase: (phase: DailyState['phase']) => void;
  children: ComponentChildren;
}

/** Owns one day's game state. Keyed by date, so a new day starts a new session. */
export function SessionProvider({
  payload,
  mountains,
  vibrateOn,
  onFinished,
  onPhase,
  children,
}: Props) {
  const reducer = useMemo(() => createDailyReducer(payload), [payload]);
  const [state, dispatch] = useReducer(reducer, payload, (p) =>
    restoreDailyState(readJson(KEYS.daily(p.date)), p, Date.now()),
  );

  // Every state change is written to storage right away (docs/05-teknis.md §7).
  useEffect(() => {
    writeJson(KEYS.daily(state.date), { ...state, feedback: null });
    onPhase(state.phase);
  }, [state]);

  useRoundEffects(state, mountains, vibrateOn, onFinished);

  const value = useMemo(() => ({ payload, state, dispatch }), [payload, state]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
