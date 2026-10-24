import { useEffect, useRef, useState } from 'preact/hooks';
import { sfx } from '../audio/sfx';
import {
  ANNOUNCE_AT_SECONDS,
  MAX_INPUT_LENGTH,
  ROUND_SECONDS,
  WARNING_SECONDS,
  WRONG_PENALTY_SECONDS,
} from '../game/constants';
import { remainingMs } from '../game/reducer';
import type { Prompt } from '../game/types';
import { t } from '../i18n/id';
import type { SessionValue } from './Session';

export function Round({ session }: { session: SessionValue }) {
  const { state, payload, dispatch } = session;
  const round = state.rounds[state.current]!;
  const prompt: Prompt = payload.prompts[state.current]!;
  const [value, setValue] = useState('');
  const [seconds, setSeconds] = useState(() => Math.ceil(remainingMs(round, Date.now()) / 1000));
  const [announce, setAnnounce] = useState('');
  const bar = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const roundRef = useRef(round);
  roundRef.current = round;

  // Remaining time is recomputed from startedAt every frame (never a decremented counter).
  useEffect(() => {
    let raf = 0;
    let lastSecond = -1;
    const frame = () => {
      const left = remainingMs(roundRef.current, Date.now());
      if (bar.current) {
        bar.current.style.transform = `scaleX(${Math.max(0, left) / (ROUND_SECONDS * 1000)})`;
      }
      const s = Math.max(0, Math.ceil(left / 1000));
      if (s !== lastSecond) {
        if (lastSecond !== -1 && s < lastSecond && s > 0 && s <= WARNING_SECONDS) sfx.tick();
        if ((ANNOUNCE_AT_SECONDS as readonly number[]).includes(s)) {
          setAnnounce(t.round.secondsLeft(s));
        }
        lastSecond = s;
        setSeconds(s);
      }
      if (left <= 0) {
        dispatch({ type: 'tick', now: Date.now() });
        return;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    const onVisible = () => dispatch({ type: 'tick', now: Date.now() });
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [state.current, dispatch]);

  useEffect(() => {
    input.current?.focus();
  }, [state.current]);

  const wrong = round.attempts.filter((a) => a.kind !== 'accepted');
  const fb = state.feedback;

  // Shake the input for 250 ms after each wrong answer (without remounting it, which would
  // drop focus and close the phone keyboard).
  const [shake, setShake] = useState(false);
  useEffect(() => {
    if (wrong.length === 0) return;
    setShake(true);
    const id = setTimeout(() => setShake(false), 250);
    return () => clearTimeout(id);
  }, [wrong.length]);
  const showsLatest = fb?.kind === 'rejected' || fb?.kind === 'unknown';
  const history = showsLatest ? wrong.slice(0, -1) : wrong;
  const feedbackText =
    fb?.kind === 'rejected'
      ? fb.reason
      : fb?.kind === 'unknown'
        ? t.round.unknown
        : fb?.kind === 'too_short'
          ? t.round.tooShort
          : fb?.kind === 'duplicate'
            ? t.round.duplicate
            : '';

  const submit = (e: Event) => {
    e.preventDefault();
    if (!value.trim()) return;
    dispatch({ type: 'submit', input: value, now: Date.now() });
    setValue('');
    input.current?.focus();
  };

  return (
    <main class="screen round">
      <div class="round-head">
        <span>{t.round.counter(state.current + 1, state.rounds.length)}</span>
        <span class={`timer ${seconds <= WARNING_SECONDS ? 'timer-warn' : ''}`}>
          ⏱ {t.round.timer(seconds)}
        </span>
      </div>
      <div class="timer-track" aria-hidden="true">
        <div class={`timer-bar ${seconds <= WARNING_SECONDS ? 'timer-warn' : ''}`} ref={bar} />
      </div>
      <p class="sr-only" aria-live="polite">
        {announce}
      </p>

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
          class={`answer-input ${shake ? 'shake' : ''}`}
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

      <div class="feedback" aria-live="assertive">
        {feedbackText && (
          <p class={`feedback-msg feedback-${fb!.kind}`}>
            <strong>
              <span class="cross" aria-hidden="true">
                ✗
              </span>{' '}
              {fb!.input}
            </strong>
            <span>{feedbackText}</span>
            {showsLatest && <span class="penalty">{t.round.penalty(WRONG_PENALTY_SECONDS)}</span>}
          </p>
        )}
      </div>

      {history.length > 0 && (
        <ul class="attempts">
          {[...history].reverse().map((a) => (
            <li key={a.at + a.key}>
              <span class="cross" aria-hidden="true">
                ✗
              </span>{' '}
              {a.input}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
