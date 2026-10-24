import { useEffect, useRef } from 'preact/hooks';
import { TierIcon } from '../components/PixelIcon';
import { altitude, checkpointsPassed, totalPoints } from '../game/scoring';
import type { Mountain, Prompt } from '../game/types';
import { REPORT_URL } from '../config';
import { t, tierMessage, tierName } from '../i18n/id';
import type { SessionValue } from './Session';

const COMMON_COUNT = 3;
const RARE_COUNT = 3;

export function Reveal({
  session,
  mountains,
}: {
  session: SessionValue;
  mountains: readonly Mountain[];
}) {
  const { state, payload, dispatch } = session;
  const round = state.rounds[state.current]!;
  const result = round.result!;
  const prompt: Prompt = payload.prompts[state.current]!;
  const last = state.current === state.rounds.length - 1;
  const nextBtn = useRef<HTMLButtonElement>(null);
  const shownAt = useRef(Date.now());

  useEffect(() => {
    shownAt.current = Date.now();
    nextBtn.current?.focus({ preventScroll: true });
  }, [state.current]);

  // Ignore a click right after the reveal appears (e.g. a repeated Enter from the answer box).
  const next = () => {
    if (Date.now() - shownAt.current < 400) return;
    dispatch({ type: 'next', now: Date.now() });
  };

  const outcome = result.outcome;
  const answer = prompt.answers.find((a) => a.id === result.answerId);
  const edelweiss = prompt.answers.find((a) => a.tier === 'edelweiss')!;
  const common = prompt.answers.filter((a) => a.tier === 'basecamp').slice(0, COMMON_COUNT);
  const rare = prompt.answers
    .filter((a) => a.tier === 'summit' && a.id !== result.answerId)
    .slice(0, RARE_COUNT);

  const after = altitude(totalPoints(state.rounds.slice(0, state.current + 1)));
  const before = altitude(totalPoints(state.rounds.slice(0, state.current)));
  const passed = checkpointsPassed(before, after, mountains);

  return (
    <main class="screen reveal">
      <section class="reveal-result" aria-live="polite">
        <div class="reveal-tier">
          <TierIcon outcome={outcome} scale={3} class="pop" />
          <span class={`tier-label tier-text-${outcome}`}>
            {outcome === 'fog' ? t.reveal.fogTitle : tierName[outcome].toUpperCase()}
          </span>
          {outcome !== 'fog' && <span class="points">{t.reveal.points(result.points)}</span>}
        </div>
        {answer && <p class="reveal-answer">"{answer.text}"</p>}
        <p class="reveal-message">{tierMessage[outcome]}</p>
      </section>

      {passed.map((m) => (
        <section class="checkpoint panel" key={m.id}>
          <h3>
            📍 {t.reveal.checkpoint}: {m.name}, {t.mdpl(m.altitude)}
          </h3>
          <p>{m.fact}</p>
        </section>
      ))}

      <section class="reveal-list">
        <h3>{t.reveal.mostCommon}</h3>
        <p>
          <TierIcon outcome="basecamp" scale={1} labelled={false} />{' '}
          {common.map((a) => a.text).join(' · ')}
        </p>
        {rare.length > 0 && (
          <>
            <h3>{t.reveal.rareMissed}</h3>
            <p>
              <TierIcon outcome="summit" scale={1} labelled={false} />{' '}
              {rare.map((a) => a.text).join(' · ')}
            </p>
          </>
        )}
        <h3>
          <TierIcon outcome="edelweiss" scale={1} labelled={false} />{' '}
          {outcome === 'edelweiss'
            ? t.reveal.edelweissFound
            : `${t.reveal.edelweiss}: ${edelweiss.text}`}
        </h3>
        <p class="fact">{prompt.edelweissFact}</p>
      </section>

      <div class="actions">
        {REPORT_URL && (
          <a class="btn btn-ghost" href={REPORT_URL} target="_blank" rel="noopener noreferrer">
            {t.reveal.report}
          </a>
        )}
        <button ref={nextBtn} class="btn btn-primary btn-wide" onClick={next}>
          {last ? t.reveal.finish : t.reveal.next} ▶
        </button>
      </div>
    </main>
  );
}
