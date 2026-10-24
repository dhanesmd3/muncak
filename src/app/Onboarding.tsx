import { useEffect, useRef, useState } from 'preact/hooks';
import { TierIcon } from '../components/PixelIcon';
import { POINTS } from '../game/constants';
import type { Tier } from '../game/types';
import { t, tierMeaning, tierName } from '../i18n/id';

const TIERS: Tier[] = ['basecamp', 'camp', 'treeline', 'summit', 'edelweiss'];

/** Three short, skippable slides (docs/02-game-design.md §6). */
export function Onboarding({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0);
  const slides = t.onboarding.slides;
  const slide = slides[i]!;
  const last = i === slides.length - 1;
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), [i]);

  return (
    <main class="screen onboarding">
      <div class="onboarding-top">
        <span class="dots" aria-hidden="true">
          {slides.map((_, n) => (n === i ? '●' : '○')).join(' ')}
        </span>
        <button class="btn btn-ghost" onClick={onDone}>
          {t.onboarding.skip}
        </button>
      </div>
      <h2 ref={heading} tabIndex={-1}>
        {slide.title}
      </h2>
      <p>{slide.body}</p>
      {i === 1 && (
        <ul class="tier-table">
          {TIERS.map((tier) => (
            <li key={tier}>
              <TierIcon outcome={tier} labelled={false} />
              <span class={`tier-label tier-text-${tier}`}>{tierName[tier]}</span>
              <span class="tier-meaning">{tierMeaning[tier]}</span>
              <span class="tier-points">+{POINTS[tier]}</span>
            </li>
          ))}
        </ul>
      )}
      <button class="btn btn-primary btn-wide" onClick={() => (last ? onDone() : setI(i + 1))}>
        {last ? t.onboarding.start : t.onboarding.next}
      </button>
    </main>
  );
}
