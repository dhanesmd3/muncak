import { useEffect, useMemo, useReducer, useRef, useState } from 'preact/hooks';
import { logModePlay } from '../api/sync';
import { loadBank } from '../api/static';
import { sfx, vibrate } from '../audio/sfx';
import { TierIcon } from '../components/PixelIcon';
import {
  EXPEDITION_BONUS,
  EXPEDITION_START_SECONDS,
  MAX_EXPEDITION_ROUNDS,
  MAX_INPUT_LENGTH,
  WARNING_SECONDS,
} from '../game/constants';
import { todayWIB } from '../game/date';
import {
  cartenzRatio,
  createExpedition,
  createExpeditionReducer,
  expeditionAltitude,
  logisticsMs,
  type ExpeditionState,
} from '../game/expedition';
import type { Prompt, Tier } from '../game/types';
import { formatNumber, t, tierName } from '../i18n/id';
import type { SceneState } from '../scene/scene';
import { loadExpeditionRecord, recordExpedition } from '../storage/modes';
import { baseScene, CARTENZ_ALTITUDE, poseFor } from './sceneState';
import { ScreenHeader } from './ScreenHeader';

const TIERS: Tier[] = ['basecamp', 'camp', 'treeline', 'summit', 'edelweiss'];
const BAR_FULL_MS = 60_000;

export interface SceneRequest {
  scene: SceneState;
  showAltitude: boolean;
  compact: boolean;
}

interface Props {
  /** Today's daily prompt ids, never used in Ekspedisi (docs/02-game-design.md §5.1). */
  excludeIds: readonly string[];
  reducedMotion: boolean;
  vibrateOn: boolean;
  keyboardOpen: boolean;
  onScene: (req: SceneRequest | null) => void;
  onBack: () => void;
}

const mmss = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

export function ExpeditionScreen(props: Props) {
  const [bank, setBank] = useState<Prompt[] | null | 'error'>(null);
  const [run, setRun] = useState(0); // 0 = intro, n = n-th run
  const [record, setRecord] = useState(loadExpeditionRecord);

  useEffect(() => {
    loadBank().then(
      (b) => setBank(b.prompts),
      () => setBank('error'),
    );
  }, []);
  useEffect(() => () => props.onScene(null), []);

  let body;
  if (bank === null) body = <p class="note">{t.home.loading}</p>;
  else if (bank === 'error') body = <p class="note">{t.expedition.loadError}</p>;
  else if (bank.length === 0) body = <p class="note">{t.expedition.empty}</p>;
  else if (run > 0) {
    return (
      <ExpeditionRun
        key={run}
        bank={bank}
        {...props}
        record={record.bestAltitude}
        onFinished={(alt) => setRecord(recordExpedition(alt))}
        onAgain={() => setRun(run + 1)}
      />
    );
  } else {
    body = (
      <>
        <p>{t.expedition.intro}</p>
        <h3>{t.expedition.bonusTable}</h3>
        <ul class="tier-table">
          {TIERS.map((tier) => (
            <li key={tier}>
              <TierIcon outcome={tier} labelled={false} />
              <span class={`tier-label tier-text-${tier}`}>{tierName[tier]}</span>
              <span class="tier-points">{t.expedition.bonus(EXPEDITION_BONUS[tier])}</span>
            </li>
          ))}
        </ul>
        <p class="note">
          {record.bestAltitude > 0
            ? t.expedition.record(t.mdpl(record.bestAltitude))
            : t.expedition.noRecord}
        </p>
        <button class="btn btn-primary btn-wide" onClick={() => setRun(1)}>
          ▶ {t.expedition.start}
        </button>
      </>
    );
  }
  return (
    <main class="screen expedition">
      <ScreenHeader title={t.expedition.title} onBack={props.onBack} />
      {body}
    </main>
  );
}

interface RunProps extends Props {
  bank: Prompt[];
  record: number;
  onFinished: (altitude: number) => void;
  onAgain: () => void;
}

function ExpeditionRun({
  bank,
  excludeIds,
  reducedMotion,
  vibrateOn,
  keyboardOpen,
  record,
  onScene,
  onBack,
  onFinished,
  onAgain,
}: RunProps) {
  const reducer = useMemo(() => createExpeditionReducer(bank), [bank]);
  const [state, dispatch] = useReducer(reducer, null, () =>
    createExpedition(bank, excludeIds, Date.now(), Math.random),
  );
  const [value, setValue] = useState('');
  const [left, setLeft] = useState(EXPEDITION_START_SECONDS * 1000);
  const [wasRecord] = useState(record);
  const bar = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const prompts = useMemo(() => new Map(bank.map((p) => [p.id, p])), [bank]);
  const alt = expeditionAltitude(state);

  // One shared timer, recomputed from startedAt every frame.
  useEffect(() => {
    if (state.phase !== 'playing') return;
    let raf = 0;
    let lastSecond = -1;
    const frame = () => {
      const ms = logisticsMs(stateRef.current, Date.now());
      if (bar.current)
        bar.current.style.transform = `scaleX(${Math.min(1, Math.max(0, ms) / BAR_FULL_MS)})`;
      const sec = Math.ceil(Math.max(0, ms) / 1000);
      if (sec !== lastSecond) {
        if (lastSecond !== -1 && sec < lastSecond && sec > 0 && sec <= WARNING_SECONDS) sfx.tick();
        lastSecond = sec;
        setLeft(ms);
      }
      if (ms <= 0) {
        dispatch({ type: 'tick', now: Date.now() });
        return;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [state.phase]);

  // Sounds, scene and the end of the run.
  const prev = useRef<ExpeditionState>(state);
  useEffect(() => {
    const before = prev.current;
    prev.current = state;
    const fb = state.feedback;
    if (fb && fb !== before.feedback) {
      if (fb.kind === 'accepted') {
        if (fb.tier === 'edelweiss') {
          sfx.edelweiss();
          if (vibrateOn) vibrate([80, 60, 120]);
        } else sfx.accepted(fb.tier);
      } else if (fb.kind === 'rejected' || fb.kind === 'unknown') sfx.wrong();
    }
    if (state.phase === 'finished' && before.phase !== 'finished') {
      sfx.fog();
      onFinished(expeditionAltitude(state));
      const rounds = [
        ...state.results.map((r) => ({ promptId: r.promptId, attempts: r.attempts })),
        ...(state.inputs.length > 0
          ? [{ promptId: state.order[state.index]!, attempts: state.inputs }]
          : []),
      ].filter((r) => r.attempts.length > 0);
      logModePlay({
        date: todayWIB(),
        mode: 'expedition',
        rounds: rounds.slice(0, MAX_EXPEDITION_ROUNDS),
      });
    }
  }, [state]);

  useEffect(() => {
    const fb = state.feedback;
    const accepted = fb?.kind === 'accepted' ? fb.tier : null;
    onScene({
      scene: {
        ...baseScene(reducedMotion),
        altitude: alt,
        pose:
          state.phase === 'finished'
            ? alt >= CARTENZ_ALTITUDE
              ? 'wave'
              : 'idle'
            : accepted
              ? poseFor(accepted)
              : 'idle',
        edelweiss: accepted === 'edelweiss',
        flag: state.phase === 'finished' && alt >= CARTENZ_ALTITUDE,
      },
      showAltitude: true,
      compact: state.phase === 'playing' && keyboardOpen,
    });
  }, [alt, state.feedback, state.phase, reducedMotion, keyboardOpen]);

  useEffect(() => {
    input.current?.focus();
  }, [state.index]);

  const ratio = cartenzRatio(alt, CARTENZ_ALTITUDE);

  if (state.phase === 'finished') {
    const answered = state.results.filter((r) => r.outcome !== 'skip').length;
    return (
      <main class="screen expedition result">
        <p class="result-title">{t.expedition.over}</p>
        <p class="result-altitude">{t.mdpl(alt)}</p>
        {ratio !== null && <p class="result-mountain">{t.expedition.timesCartenz(ratio)}</p>}
        <p>{t.expedition.answered(answered)}</p>
        {alt > wasRecord && alt > 0 && <p class="streak">{t.expedition.newRecord}</p>}
        <p class="note">{t.expedition.record(t.mdpl(Math.max(alt, wasRecord)))}</p>
        <div class="actions">
          <button class="btn btn-primary btn-wide" onClick={onAgain}>
            ▶ {t.expedition.again}
          </button>
          <button class="btn btn-wide" onClick={onBack}>
            {t.back}
          </button>
        </div>
      </main>
    );
  }

  const prompt = prompts.get(state.order[state.index]!)!;
  const fb = state.feedback;
  const submit = (e: Event) => {
    e.preventDefault();
    if (!value.trim()) return;
    dispatch({ type: 'submit', input: value, now: Date.now() });
    setValue('');
    input.current?.focus();
  };

  return (
    <main class="screen round expedition">
      <div class="round-head">
        <span>
          {formatNumber(alt)} mdpl{ratio !== null ? ` · ${t.expedition.timesCartenz(ratio)}` : ''}
        </span>
        <span class={`timer ${left <= WARNING_SECONDS * 1000 ? 'timer-warn' : ''}`}>
          🎒 {t.expedition.logistics} {mmss(left)}
        </span>
      </div>
      <div class="timer-track" aria-hidden="true">
        <div class={`timer-bar ${left <= WARNING_SECONDS * 1000 ? 'timer-warn' : ''}`} ref={bar} />
      </div>

      <h2 class="prompt" id="prompt-text">
        {prompt.prompt}
      </h2>
      <form class="answer-form" onSubmit={submit} autocomplete="off">
        <label class="sr-only" for="answer">
          {t.round.inputLabel}
        </label>
        <input
          id="answer"
          ref={input}
          class="answer-input"
          type="text"
          value={value}
          maxLength={MAX_INPUT_LENGTH}
          placeholder={t.round.placeholder}
          aria-describedby="prompt-text"
          autocapitalize="off"
          autocorrect="off"
          spellcheck={false}
          enterkeyhint="go"
          onInput={(e) => setValue((e.target as HTMLInputElement).value)}
        />
        <button class="btn btn-primary btn-go" type="submit" aria-label={t.round.submit}>
          ⛰ <span class="btn-go-text">{t.round.submit}</span>
        </button>
      </form>
      <button class="btn btn-ghost" onClick={() => dispatch({ type: 'skip', now: Date.now() })}>
        {t.expedition.skip}
      </button>

      <div class="feedback" aria-live="polite">
        {fb?.kind === 'accepted' && (
          <p class="feedback-msg">
            <span>
              <TierIcon outcome={fb.tier} scale={1} labelled={false} />{' '}
              <strong class={`tier-text-${fb.tier}`}>{tierName[fb.tier]}</strong> · "{fb.answerText}
              " · {t.expedition.bonus(fb.bonusSeconds)}
            </span>
          </p>
        )}
        {fb?.kind === 'rejected' && (
          <p class="feedback-msg">
            <strong>
              <span class="cross" aria-hidden="true">
                ✗
              </span>{' '}
              {fb.input}
            </strong>
            <span>{fb.reason}</span>
          </p>
        )}
        {fb?.kind === 'unknown' && <p class="feedback-msg">{t.round.unknown}</p>}
        {fb?.kind === 'too_short' && <p class="feedback-msg">{t.round.tooShort}</p>}
        {fb?.kind === 'duplicate' && <p class="feedback-msg">{t.round.duplicate}</p>}
        {fb?.kind === 'skipped' && <p class="feedback-msg note">{t.expedition.skipped}</p>}
      </div>
    </main>
  );
}
