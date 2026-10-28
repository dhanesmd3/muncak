import type { JSX } from 'preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import mountainsJson from '../../content/mountains.json';
import { API_ENABLED, api, appNow, trackEvent } from '../api/client';
import { flushPendingPlay, submitDailyPlay } from '../api/sync';
import { setMusic, setSound, unlockAudio } from '../audio/sfx';
import { SceneView } from '../components/SceneView';
import { timeOfDayWIB, todayWIB } from '../game/date';
import { parseGroupCode, type MyGroup } from '../game/groups';
import { playFromDaily } from '../game/play';
import { altitude, outcomes, reachedMountain, totalPoints } from '../game/scoring';
import { currentStreak, recordDaily } from '../game/stats';
import type { DailyPhase, DailyState, Mountain } from '../game/types';
import { t } from '../i18n/id';
import { ensureDevice } from '../storage/device';
import { loadGroups, saveGroups } from '../storage/modes';
import { loadSettings, saveSettings, type Settings } from '../storage/settings';
import { loadStats, saveStats } from '../storage/stats';
import { clearAll, isPersistent, pruneDaily } from '../storage/storage';
import { AboutScreen } from './AboutScreen';
import { ExpeditionScreen, type SceneRequest } from './ExpeditionScreen';
import { GroupScreen, GroupsScreen } from './GroupsScreen';
import { Home } from './Home';
import { useKeyboardOpen, useNow, usePrefersReducedMotion } from './hooks';
import { Onboarding } from './Onboarding';
import { PacksScreen } from './PacksScreen';
import { PrivacyScreen } from './PrivacyScreen';
import { Result } from './Result';
import { Reveal } from './Reveal';
import { Round } from './Round';
import { baseScene, sessionScene } from './sceneState';
import { SessionProvider, useSession } from './Session';
import { SettingsScreen } from './SettingsScreen';
import { StatsScreen } from './StatsScreen';
import { useDaily, type DailyLoad } from './useDaily';

const MOUNTAINS = mountainsJson as Mountain[];
const ROLLOVER_CHECK_MS = 30_000;

export type Screen =
  | 'home'
  | 'onboarding'
  | 'game'
  | 'stats'
  | 'settings'
  | 'about'
  | 'privacy'
  | 'expedition'
  | 'packs'
  | 'groups'
  | 'group';

/** A shared link /r/MCK-XXXX opens that Rombongan (docs/02-game-design.md §5.3). */
function groupFromUrl(): string | null {
  const m = /\/r\/([^/?#]+)/.exec(location.pathname);
  return m ? parseGroupCode(decodeURIComponent(m[1]!)) : null;
}

export function App() {
  const [settings, setSettings] = useState(loadSettings);
  const [stats, setStats] = useState(loadStats);
  const [linkedGroup] = useState(() => (API_ENABLED ? groupFromUrl() : null));
  const [screen, setScreen] = useState<Screen>(linkedGroup ? 'group' : 'home');
  const [today, setToday] = useState(() => todayWIB(appNow()));
  const load = useDaily(today);
  const osReducedMotion = usePrefersReducedMotion();
  const reducedMotion = settings.reducedMotion || osReducedMotion;

  const phase = useRef<DailyPhase>('idle');
  const screenRef = useRef(screen);
  screenRef.current = screen;

  useEffect(() => {
    ensureDevice(Date.now());
    pruneDaily(todayWIB(appNow()));
    if (linkedGroup) history.replaceState(null, '', import.meta.env.BASE_URL);
    // A play that could not be sent (offline) goes out as soon as possible.
    void flushPendingPlay();
    const online = () => void flushPendingPlay();
    window.addEventListener('online', online);
    return () => window.removeEventListener('online', online);
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
      const d = todayWIB(appNow());
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
    trackEvent('session_finished');
    void submitDailyPlay(playFromDaily(state));
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
      linkedGroup={linkedGroup}
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
  linkedGroup: string | null;
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
  linkedGroup,
  statsView,
}: ScreensProps) {
  const session = useSession();
  const keyboardOpen = useKeyboardOpen();
  // The scene palette follows the WIB hour (morning/day/evening/night), checked every minute.
  useNow(60_000);
  const timeOfDay = timeOfDayWIB(appNow());
  const [playAfterOnboarding, setPlayAfterOnboarding] = useState(false);
  const [privacyFrom, setPrivacyFrom] = useState<Screen>('settings');
  const [groups, setGroupsState] = useState<MyGroup[]>(loadGroups);
  const [groupCode, setGroupCode] = useState<string | null>(linkedGroup);
  const [modeScene, setModeScene] = useState<SceneRequest | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const st = session?.state;

  const setGroups = (g: MyGroup[]) => {
    setGroupsState(g);
    saveGroups(g);
  };
  const openGroup = (code: string) => {
    setGroupCode(code);
    setScreen('group');
  };

  const start = () => {
    session!.dispatch({ type: 'start', now: Date.now() });
    trackEvent('session_started');
    setScreen('game');
  };

  const play = () => {
    unlockAudio();
    if (!session) return;
    if (session.state.phase === 'idle') {
      if (!settings.onboarded) {
        setPlayAfterOnboarding(true);
        setScreen('onboarding');
        return;
      }
      start();
      return;
    }
    setScreen('game');
  };

  const finishOnboarding = () => {
    setSettings({ ...settings, onboarded: true });
    if (playAfterOnboarding && session?.state.phase === 'idle') {
      setPlayAfterOnboarding(false);
      start();
    } else {
      setScreen('home');
    }
  };

  const openPrivacy = (from: Screen) => {
    setPrivacyFrom(from);
    setScreen('privacy');
  };

  const deleteData = async () => {
    setDeleteError('');
    if (API_ENABLED) {
      try {
        await api.deleteMe();
      } catch {
        // Keep the local data (and device id) so the player can retry the server delete.
        setDeleteError(t.settings.deleteFailed);
        return;
      }
    }
    clearAll();
    location.reload();
  };

  // What the pixel scene shows.
  const inGame = screen === 'game' && !!st && st.phase !== 'idle';
  const inMode = screen === 'expedition' || screen === 'packs';
  let scene = baseScene(reducedMotion);
  let showAltitude = false;
  let compact = false;
  if (inGame && st) {
    scene = sessionScene(st, reducedMotion);
    showAltitude = true;
    compact = st.phase === 'playing' && keyboardOpen;
  } else if (inMode && modeScene) {
    ({ scene, showAltitude, compact } = modeScene);
  }

  const back = () => setScreen('home');
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
          onHome={back}
          onGroups={API_ENABLED ? () => setScreen('groups') : undefined}
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
        onDeleteData={deleteData}
        error={deleteError}
        onBack={back}
      />
    );
  } else if (screen === 'about') {
    content = <AboutScreen onPrivacy={() => openPrivacy('about')} onBack={back} />;
  } else if (screen === 'privacy') {
    content = <PrivacyScreen onBack={() => setScreen(privacyFrom)} />;
  } else if (screen === 'expedition') {
    content = (
      <ExpeditionScreen
        excludeIds={session?.payload.prompts.map((p) => p.id) ?? []}
        reducedMotion={reducedMotion}
        vibrateOn={settings.vibrate}
        keyboardOpen={keyboardOpen}
        onScene={setModeScene}
        onBack={back}
      />
    );
  } else if (screen === 'packs') {
    content = (
      <PacksScreen
        mountains={MOUNTAINS}
        reducedMotion={reducedMotion}
        vibrateOn={settings.vibrate}
        keyboardOpen={keyboardOpen}
        onScene={setModeScene}
        onBack={back}
      />
    );
  } else if (screen === 'groups' && API_ENABLED) {
    content = (
      <GroupsScreen groups={groups} setGroups={setGroups} onOpen={openGroup} onBack={back} />
    );
  } else if (screen === 'group' && API_ENABLED && groupCode) {
    content = (
      <GroupScreen
        key={groupCode}
        code={groupCode}
        groups={groups}
        setGroups={setGroups}
        mountains={MOUNTAINS}
        onBack={() => setScreen('groups')}
      />
    );
  } else {
    content = (
      <Home
        load={load}
        onRetry={load.retry}
        streak={streak}
        onPlay={play}
        onNavigate={(s) => {
          unlockAudio();
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
        state={{ ...scene, timeOfDay }}
        mountains={MOUNTAINS}
        showAltitude={showAltitude}
        compact={compact}
      />
      {content}
    </div>
  );
}
