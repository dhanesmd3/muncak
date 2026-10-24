import { useEffect, useRef } from 'preact/hooks';
import { t } from '../i18n/id';

export function ScreenHeader({ title, onBack }: { title: string; onBack: () => void }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus({ preventScroll: true }), []);
  return (
    <header class="screen-header">
      <button class="btn btn-ghost" onClick={onBack}>
        ◀ {t.back}
      </button>
      <h2 ref={heading} tabIndex={-1}>
        {title}
      </h2>
    </header>
  );
}
