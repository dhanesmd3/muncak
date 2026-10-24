import type { JSX } from 'preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import mountainsJson from '../../content/mountains.json';
import { setMusic, setSound, unlockAudio } from '../audio/sfx';
import { SceneView } from '../components/SceneView';
import { todayWIB } from '../game/date';
import { altitude, outcomes, reachedMountain, totalPoints } from '../game/scoring';
import { currentStreak, recordDaily } from '../game/stats';
import type { DailyPhase, DailyState, Mountain } from '../game/types';
import { t } from '../i18n/id';
import type { RestPose, SceneState } from '../scene/scene';
import { ensureDevice } from '../storage/device';
import { loadSettings, saveSettings, type Settings } from '../storage/settings';
import { loadStats, saveStats } from '../storage/stats';
import { clearAll, isPersistent, pruneDaily } from '../storage/storage';
import { AboutScreen } from './AboutScreen';
import { Home } from './Home';
import { useKeyboardOpen, usePrefersReducedMotion } from './hooks';
import { Onboarding } from './Onboarding';
import { PrivacyScreen } from './PrivacyScreen';
import { Result } from './Result';
import { Reveal } from './Reveal';
import { Round } from './Round';
import { SessionProvider, useSession } from './Session';
import { SettingsScreen } from './SettingsScreen';
import { StatsScreen } from './StatsScreen';
import { useDaily, type DailyLoad } from './useDaily';

const MOUNTAINS = mountainsJson as Mountain[];
const ROLLOVER_CHECK_MS = 30_000;

export type Screen = 'home' | 'onboarding' | 'game' | 'stats' | 'settings' | 'about' | 'privacy';

export function App() {
  const [settings, setSettings] = useState(loadSettings);
  const [stats, setStats] = useState(loadStats);
  const [screen, setScreen] = useState<Screen>('home');
  const [today, setToday] = useState(() => todayWIB());
  const load = useDaily(today);
  const osReducedMotion = usePrefersReducedMotion();
  const reducedMotion = settings.reducedMotion || osReducedMotion;

  const phase = useRef<DailyPhase>('idle');
  const screenRef = useRef(screen);
  screenRef.current = screen;

  useEffect(() => {
    ensureDevice(Date.now());
    pruneDaily(todayWIB());
  }, []);

  useEffect(() => {
    saveSettings(settings);
    setSound(settings.sound);
    setMusic(settings.music);
    const root = document.documentElement;
    root.dataset.contrast = settings.highContrast ? 'high' : 'normal';
    root.dataset.motion = reducedMotion ? 'reduced' : 'full';
  }, [settings, reducedMotion]);

  // New WIB day: load the new prompts, but let a round in progress finish first.
  useEffect(() => {
    const check = () => {
      const d = todayWIB();
      if (d === today) return;
      const inRound = phase.current === 'playing' || phase.current === 'reveal';
      if (screenRef.current === 'game' && inRound) return;
      setToday(d);
      if (screenRef.current === 'game') setScreen('home');
    };
    const id = setInterval(check, ROLLOVER_CHECK_MS);
    document.addEventListener('visibilitychange', check);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', check);
    };
  }, [today]);

  const onFinished = useCallback((state: DailyState) => {
    const alt = altitude(totalPoints(state.rounds));
    setStats((prev) => {
      const next = recordDaily(prev, {
        date: state.date,
        altitude: alt,
        outcomes: outcomes(state.rounds),
        mountain: reachedMountain(alt, MOUNTAINS),
      });
      saveStats(next);
      return next;
    });
  }, []);
  const onPhase = useCallback((p: DailyPhase) => {
    phase.current = p;
  }, []);

  const screens = (
    <Screens
      load={load}
      screen={screen}
      setScreen={setScreen}
      settings={settings}
      setSettings={setSettings}
      streak={currentStreak(stats, today)}
      reducedMotion={reducedMotion}
      statsView={
        <StatsScreen
          stats={stats}
          today={today}
          mountains={MOUNTAINS}
          onBack={() => setScreen('home')}
        />
      }
    />
  );

  return load.status === 'ready' ? (
    <SessionProvider
      key={load.payload.date}
      payload={load.payload}
      mountains={MOUNTAINS}
      vibrateOn={settings.vibrate}
      onFinished={onFinished}
      onPhase={onPhase}
    >
      {screens}
    </SessionProvider>
  ) : (
    screens
  );
}

interface ScreensProps {
  load: DailyLoad & { retry: () => void };
  screen: Screen;
  setScreen: (s: Screen) => void;
  settings: Settings;
  setSettings: (s: Settings) => void;
  streak: number;
  reducedMotion: boolean;
  statsView: JSX.Element;
}

function Screens({
  load,
  screen,
  setScreen,
  settings,
  setSettings,
  streak,
  reducedMotion,
  statsView,
}: ScreensProps) {
  const session = useSession();
  const keyboardOpen = useKeyboardOpen();
  const [playAfterOnboarding, setPlayAfterOnboarding] = useState(false);
  const [privacyFrom, setPrivacyFrom] = useState<Screen>('settings');
  const st = session?.state;

  const play = () => {
    unlockAudio();
    if (!session) return;
    if (session.state.phase === 'idle') {
      if (!settings.onboarded) {
        setPlayAfterOnboarding(true);
        setScreen('onboarding');
        return;
      }
      session.dispatch({ type: 'start', now: Date.now() });
    }
    setScreen('game');
  };

  const finishOnboarding = () => {
    setSettings({ ...settings, onboarded: true });
    if (playAfterOnboarding && session?.state.phase === 'idle') {
      setPlayAfterOnboarding(false);
      session.dispatch({ type: 'start', now: Date.now() });
      setScreen('game');
    } else {
      setScreen('home');
    }
  };

  const openPrivacy = (from: Screen) => {
    setPrivacyFrom(from);
    setScreen('privacy');
  };

  // What the pixel scene shows.
  const inGame = screen === 'game' && !!st && st.phase !== 'idle';
  let scene: SceneState = {
    altitude: 0,
    pose: 'idle',
    fog: false,
    edelweiss: false,
    flag: false,
    reducedMotion,
  };
  if (inGame && st) {
    scene = { ...scene, altitude: altitude(totalPoints(st.rounds)) };
    if (st.phase === 'reveal') {
      const outcome = st.rounds[st.current]!.result!.outcome;
      const pose: RestPose =
        outcome === 'fog'
          ? 'cold'
          : outcome === 'summit' || outcome === 'edelweiss'
            ? 'jump'
            : 'idle';
      scene = { ...scene, pose, fog: outcome === 'fog', edelweiss: outcome === 'edelweiss' };
    } else if (st.phase === 'finished') {
      scene = { ...scene, pose: 'jump', flag: true };
    }
  }

  let content;
  if (screen === 'game' && session && inGame) {
    if (session.state.phase === 'playing') content = <Round session={session} />;
    else if (session.state.phase === 'reveal') {
      content = <Reveal session={session} mountains={MOUNTAINS} />;
    } else {
      content = (
        <Result
          session={session}
          mountains={MOUNTAINS}
          onStats={() => setScreen('stats')}
          onHome={() => setScreen('home')}
        />
      );
    }
  } else if (screen === 'onboarding') {
    content = <Onboarding onDone={finishOnboarding} />;
  } else if (screen === 'stats') {
    content = statsView;
  } else if (screen === 'settings') {
    content = (
      <SettingsScreen
        settings={settings}
        onChange={setSettings}
        onPrivacy={() => openPrivacy('settings')}
        onDeleteData={() => {
          clearAll();
          location.reload();
        }}
        onBack={() => setScreen('home')}
      />
    );
  } else if (screen === 'about') {
    content = (
      <AboutScreen onPrivacy={() => openPrivacy('about')} onBack={() => setScreen('home')} />
    );
  } else if (screen === 'privacy') {
    content = <PrivacyScreen onBack={() => setScreen(privacyFrom)} />;
  } else {
    content = (
      <Home
        load={load}
        onRetry={load.retry}
        streak={streak}
        onPlay={play}
        onNavigate={(s) => {
          setPlayAfterOnboarding(false);
          setScreen(s);
        }}
      />
    );
  }

  return (
    <div class="app">
      {!isPersistent() && (
        <p class="storage-warning" role="status">
          {t.storageWarning}
        </p>
      )}
      <SceneView
        state={scene}
        mountains={MOUNTAINS}
        showAltitude={inGame}
        compact={inGame && st?.phase === 'playing' && keyboardOpen}
      />
      {content}
    </div>
  );
}
