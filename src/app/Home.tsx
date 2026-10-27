import { API_ENABLED } from '../api/client';
import { ROUNDS_PER_DAY } from '../game/constants';
import { t } from '../i18n/id';
import type { DailyLoad } from './useDaily';
import { useSession } from './Session';

interface Props {
  load: DailyLoad;
  onRetry: () => void;
  streak: number;
  onPlay: () => void;
  onNavigate: (
    screen: 'stats' | 'settings' | 'onboarding' | 'about' | 'expedition' | 'packs' | 'groups',
  ) => void;
}

export function Home({ load, onRetry, streak, onPlay, onNavigate }: Props) {
  const session = useSession();
  const phase = session?.state.phase;

  let main;
  if (session) {
    const label =
      phase === 'finished'
        ? t.home.seeResult
        : phase === 'playing' || phase === 'reveal'
          ? t.home.continue
          : t.home.playDaily;
    main = (
      <>
        <button class="btn btn-primary btn-big" onClick={onPlay}>
          <span class="btn-big-title">▶ {label}</span>
          <span class="btn-big-meta">
            {t.home.dailyMeta(session.payload.dayNumber, ROUNDS_PER_DAY)}
          </span>
        </button>
        {phase === 'finished' && <p class="note">{t.home.alreadyPlayed}</p>}
      </>
    );
  } else if (load.status === 'loading') {
    main = (
      <button class="btn btn-primary btn-big" disabled>
        <span class="btn-big-title">{t.home.loading}</span>
      </button>
    );
  } else {
    main = (
      <div class="panel" role="status">
        <p>{load.status === 'missing' ? t.home.preparing : t.home.loadError}</p>
        <button class="btn" onClick={onRetry}>
          {t.home.retry}
        </button>
      </div>
    );
  }

  return (
    <main class="screen home">
      <h1 class="logo">{t.appName.toUpperCase()}</h1>
      <p class="tagline">{t.tagline}</p>
      <div class="home-main">{main}</div>
      <div class="home-modes">
        <button class="btn" onClick={() => onNavigate('expedition')}>
          🎒 {t.home.expedition}
        </button>
        <button class="btn" onClick={() => onNavigate('packs')}>
          🗂️ {t.home.packs}
        </button>
        {API_ENABLED && (
          <button class="btn btn-span" onClick={() => onNavigate('groups')}>
            ⛺ {t.home.groups}
          </button>
        )}
      </div>
      {streak > 0 && <p class="streak">{t.home.streak(streak)}</p>}
      <nav class="home-nav">
        <button class="btn" onClick={() => onNavigate('stats')}>
          📊 {t.home.stats}
        </button>
        <button class="btn" onClick={() => onNavigate('settings')}>
          ⚙️ {t.home.settings}
        </button>
        <button class="btn" onClick={() => onNavigate('onboarding')}>
          ❓ {t.home.help}
        </button>
        <button class="btn" onClick={() => onNavigate('about')}>
          ℹ️ {t.home.about}
        </button>
      </nav>
    </main>
  );
}
