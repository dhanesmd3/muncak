import { useState } from 'preact/hooks';
import { TierIcon } from '../components/PixelIcon';
import { formatCountdown, msUntilNextReset, todayWIB } from '../game/date';
import { altitude, outcomes, reachedMountain, titleFor, totalPoints } from '../game/scoring';
import type { Mountain } from '../game/types';
import { t } from '../i18n/id';
import { copyText, shareResult, shareText } from '../share/share';
import { useNow } from './hooks';
import type { SessionValue } from './Session';

interface Props {
  session: SessionValue;
  mountains: readonly Mountain[];
  onStats: () => void;
  onHome: () => void;
}

export function Result({ session, mountains, onStats, onHome }: Props) {
  const { state } = session;
  const alt = altitude(totalPoints(state.rounds));
  const mountain = reachedMountain(alt, mountains);
  const row = outcomes(state.rounds);
  const now = useNow(1000);
  const left = msUntilNextReset(new Date(now));
  const newDay = todayWIB(new Date(now)) !== state.date;
  const [toast, setToast] = useState('');

  const text = shareText({
    dayNumber: state.dayNumber,
    altitude: alt,
    mountainShortName: mountain.shortName,
    outcomes: row,
    url: `${location.origin}${import.meta.env.BASE_URL}`,
  });

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const onShare = async () => {
    const res = await shareResult(text);
    if (res === 'copied') flash(t.result.copied);
    if (res === 'failed') flash(t.result.copyFailed);
  };
  const onCopy = async () => flash((await copyText(text)) ? t.result.copied : t.result.copyFailed);

  return (
    <main class="screen result">
      <p class="result-altitude">{t.mdpl(alt)}</p>
      <p class="result-mountain">▲ {mountain.name.toUpperCase()}</p>
      <p class="result-title">{titleFor(alt)}</p>
      <p class="result-row">
        {row.map((o, i) => (
          <TierIcon key={i} outcome={o} scale={2} />
        ))}
      </p>

      <div class="actions">
        <button class="btn btn-primary btn-wide" onClick={onShare}>
          📤 {t.result.share}
        </button>
        <div class="actions-row">
          <button class="btn" onClick={onCopy}>
            {t.result.copy}
          </button>
          <button class="btn" onClick={onStats}>
            {t.result.stats}
          </button>
          <button class="btn" onClick={onHome}>
            {t.result.home}
          </button>
        </div>
      </div>
      <p class="toast" role="status" aria-live="polite">
        {toast}
      </p>

      <p class="countdown">{newDay ? t.result.newReady : t.result.nextIn(formatCountdown(left))}</p>
    </main>
  );
}
