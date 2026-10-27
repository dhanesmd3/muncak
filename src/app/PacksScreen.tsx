import { useEffect, useMemo, useReducer, useState } from 'preact/hooks';
import { logModePlay } from '../api/sync';
import { loadPack, loadPackIndex } from '../api/static';
import { TierIcon } from '../components/PixelIcon';
import { todayWIB } from '../game/date';
import { inSeason } from '../game/packs';
import { playFromDaily } from '../game/play';
import { createDailyReducer, createDailyState } from '../game/reducer';
import { altitude, outcomes, reachedMountain, titleFor, totalPoints } from '../game/scoring';
import type { DailyPayload, DailyState, Mountain, PackInfo, PackPayload } from '../game/types';
import { t } from '../i18n/id';
import { loadPackBests, recordPack, type PackBest } from '../storage/modes';
import type { SceneRequest } from './ExpeditionScreen';
import { Reveal } from './Reveal';
import { Round } from './Round';
import { sessionScene } from './sceneState';
import { ScreenHeader } from './ScreenHeader';
import { useRoundEffects, type SessionValue } from './Session';

interface Props {
  mountains: readonly Mountain[];
  reducedMotion: boolean;
  vibrateOn: boolean;
  keyboardOpen: boolean;
  onScene: (req: SceneRequest | null) => void;
  onBack: () => void;
}

export function PacksScreen(props: Props) {
  const [index, setIndex] = useState<PackInfo[] | null | 'error'>(null);
  const [bests, setBests] = useState(loadPackBests);
  const [active, setActive] = useState<{ pack: PackPayload; run: number } | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    loadPackIndex().then(
      (packs) => setIndex(packs.filter((p) => inSeason(p, todayWIB()))),
      () => setIndex('error'),
    );
  }, []);
  useEffect(() => () => props.onScene(null), []);

  const open = (id: string) => {
    setLoading(id);
    setFailed(false);
    loadPack(id).then(
      (pack) => {
        setLoading(null);
        setActive({ pack, run: 1 });
      },
      () => {
        setLoading(null);
        setFailed(true);
      },
    );
  };

  if (active) {
    return (
      <PackGame
        key={`${active.pack.id}:${active.run}`}
        pack={active.pack}
        {...props}
        best={bests[active.pack.id] ?? null}
        onFinished={(best) => setBests(recordPack(active.pack.id, best))}
        onAgain={() => setActive({ ...active, run: active.run + 1 })}
        onBack={() => {
          props.onScene(null);
          setActive(null);
        }}
      />
    );
  }

  let body;
  if (index === null) body = <p class="note">{t.home.loading}</p>;
  else if (index === 'error') body = <p class="note">{t.packs.loadError}</p>;
  else if (index.length === 0) body = <p class="note">{t.packs.empty}</p>;
  else {
    body = (
      <ul class="pack-grid">
        {index.map((p) => {
          const best = bests[p.id];
          return (
            <li key={p.id}>
              <button class="pack-card" disabled={loading !== null} onClick={() => open(p.id)}>
                <span class="pack-title">{p.title}</span>
                <span class="pack-desc">{p.description}</span>
                <span class="pack-best">
                  {best ? t.packs.best(t.mdpl(best.altitude)) : t.packs.notPlayed}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    );
  }
  return (
    <main class="screen packs">
      <ScreenHeader title={t.packs.title} onBack={props.onBack} />
      <p>{t.packs.intro}</p>
      {failed && <p class="note">{t.packs.loadError}</p>}
      {body}
    </main>
  );
}

interface GameProps extends Props {
  pack: PackPayload;
  best: PackBest | null;
  onFinished: (best: PackBest) => void;
  onAgain: () => void;
}

/** Same rounds as Muncak Harian, kept in memory only (packs can be replayed anyway). */
function PackGame({
  pack,
  mountains,
  reducedMotion,
  vibrateOn,
  keyboardOpen,
  best,
  onScene,
  onBack,
  onFinished,
  onAgain,
}: GameProps) {
  const payload: DailyPayload = useMemo(
    () => ({ date: todayWIB(), dayNumber: 0, prompts: pack.prompts }),
    [pack],
  );
  const reducer = useMemo(() => createDailyReducer(payload), [payload]);
  const [state, dispatch] = useReducer(reducer, payload, (p) =>
    reducer(createDailyState(p), { type: 'start', now: Date.now() }),
  );
  const [prevBest] = useState(best);

  useRoundEffects(state, mountains, vibrateOn, (done: DailyState) => {
    const alt = altitude(totalPoints(done.rounds));
    onFinished({ altitude: alt, outcomes: outcomes(done.rounds) });
    logModePlay({ ...playFromDaily(done), mode: 'pack' });
  });

  useEffect(() => {
    onScene({
      scene: sessionScene(state, reducedMotion),
      showAltitude: true,
      compact: state.phase === 'playing' && keyboardOpen,
    });
  }, [state, reducedMotion, keyboardOpen]);

  const session: SessionValue = { payload, state, dispatch };
  if (state.phase === 'playing') return <Round session={session} />;
  if (state.phase === 'reveal') return <Reveal session={session} mountains={mountains} />;

  const alt = altitude(totalPoints(state.rounds));
  const mountain = reachedMountain(alt, mountains);
  return (
    <main class="screen result">
      <p class="note">{pack.title}</p>
      <p class="result-altitude">{t.mdpl(alt)}</p>
      <p class="result-mountain">▲ {mountain.name.toUpperCase()}</p>
      <p class="result-title">{titleFor(alt)}</p>
      <p class="result-row">
        {outcomes(state.rounds).map((o, i) => (
          <TierIcon key={i} outcome={o} scale={2} />
        ))}
      </p>
      {(!prevBest || alt > prevBest.altitude) && <p class="streak">{t.packs.newBest}</p>}
      <div class="actions">
        <button class="btn btn-primary btn-wide" onClick={onAgain}>
          ▶ {t.packs.again}
        </button>
        <button class="btn btn-wide" onClick={onBack}>
          {t.packs.backToPacks}
        </button>
      </div>
    </main>
  );
}
