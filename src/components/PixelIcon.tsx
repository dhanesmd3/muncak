import type { Outcome } from '../game/types';
import { tierName } from '../i18n/id';
import { PIXEL_KEY } from '../scene/palette';
import { TIER_ICONS, type Sprite } from '../scene/sprites';

const pathCache = new Map<Sprite, { color: string; d: string }[]>();

/** One SVG path per color, built from horizontal runs of pixels. */
function paths(sprite: Sprite) {
  let cached = pathCache.get(sprite);
  if (cached) return cached;
  const byColor = new Map<string, string>();
  sprite.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x]!;
      let end = x + 1;
      while (end < row.length && row[end] === ch) end++;
      const color = PIXEL_KEY[ch];
      if (color)
        byColor.set(color, (byColor.get(color) ?? '') + `M${x} ${y}h${end - x}v1h${x - end}z`);
      x = end;
    }
  });
  cached = [...byColor].map(([color, d]) => ({ color, d }));
  pathCache.set(sprite, cached);
  return cached;
}

interface Props {
  sprite: Sprite;
  /** Integer scale only, so pixels stay sharp. */
  scale?: number;
  /** Accessible name. Omit for decorative icons. */
  label?: string;
  class?: string;
}

export function PixelIcon({ sprite, scale = 2, label, class: cls }: Props) {
  const w = sprite[0]!.length;
  const h = sprite.length;
  return (
    <svg
      class={`pixel-icon ${cls ?? ''}`}
      width={w * scale}
      height={h * scale}
      viewBox={`0 0 ${w} ${h}`}
      shape-rendering="crispEdges"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {paths(sprite).map(({ color, d }) => (
        <path key={color} d={d} fill={color} />
      ))}
    </svg>
  );
}

export function TierIcon({
  outcome,
  scale = 2,
  labelled = true,
  class: cls,
}: {
  outcome: Outcome;
  scale?: number;
  labelled?: boolean;
  class?: string;
}) {
  return (
    <PixelIcon
      sprite={TIER_ICONS[outcome]}
      scale={scale}
      label={labelled ? tierName[outcome] : undefined}
      class={`tier-icon tier-${outcome} ${cls ?? ''}`}
    />
  );
}
