import { PixelIcon, TierIcon } from '../components/PixelIcon';
import { OUTCOMES, averageAltitude, currentStreak, type Stats } from '../game/stats';
import type { Mountain } from '../game/types';
import { formatNumber, t, tierName } from '../i18n/id';
import { mountainCard } from '../scene/sprites';
import { ScreenHeader } from './ScreenHeader';

interface Props {
  stats: Stats;
  today: string;
  mountains: readonly Mountain[];
  onBack: () => void;
}

export function StatsScreen({ stats, today, mountains, onBack }: Props) {
  const best = mountains.find((m) => m.id === stats.bestMountainId);
  const maxCount = Math.max(1, ...OUTCOMES.map((o) => stats.tierCounts[o]));
  const album = mountains.filter((m) => m.altitude > 0);

  return (
    <main class="screen stats">
      <ScreenHeader title={t.stats.title} onBack={onBack} />
      {stats.played === 0 && <p class="note">{t.stats.empty}</p>}

      <dl class="stat-grid">
        <div>
          <dt>{t.stats.played}</dt>
          <dd>{stats.played}</dd>
        </div>
        <div>
          <dt>{t.stats.streak}</dt>
          <dd>{t.stats.days(currentStreak(stats, today))}</dd>
        </div>
        <div>
          <dt>{t.stats.bestStreak}</dt>
          <dd>{t.stats.days(stats.bestStreak)}</dd>
        </div>
        <div>
          <dt>{t.stats.average}</dt>
          <dd>{t.mdpl(averageAltitude(stats))}</dd>
        </div>
        <div class="wide">
          <dt>{t.stats.best}</dt>
          <dd>
            {t.mdpl(stats.bestAltitude)}
            {best && stats.played > 0 ? ` · ${best.name}` : ''}
          </dd>
        </div>
        <div class="wide">
          <dt>{t.stats.edelweiss}</dt>
          <dd>🌼 × {formatNumber(stats.edelweissCount)}</dd>
        </div>
      </dl>

      <h3>{t.stats.distribution}</h3>
      <ul class="bars">
        {OUTCOMES.map((o) => (
          <li key={o}>
            <TierIcon outcome={o} scale={1} labelled={false} />
            <span class="bar-label">{tierName[o]}</span>
            <span class="bar-track">
              <span
                class={`bar-fill bar-${o}`}
                style={{ width: `${(stats.tierCounts[o] / maxCount) * 100}%` }}
              />
            </span>
            <span class="bar-count">{stats.tierCounts[o]}</span>
          </li>
        ))}
      </ul>

      <h3>{t.stats.album}</h3>
      <ul class="album">
        {album.map((m) => {
          const got = stats.mountains.includes(m.id);
          return (
            <li key={m.id} class={got ? 'album-card got' : 'album-card'}>
              {got ? (
                <PixelIcon
                  sprite={mountainCard(m.id, m.altitude)}
                  scale={2}
                  class="album-card-art"
                />
              ) : (
                <span class="album-icon" aria-hidden="true">
                  ?
                </span>
              )}
              <span class="album-name">{got ? m.shortName : t.stats.unknownMountain}</span>
              <span class="album-alt">{t.mdpl(m.altitude)}</span>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
