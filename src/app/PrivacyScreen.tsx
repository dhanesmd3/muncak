import { CONTACT_EMAIL, PRIVACY_UPDATED } from '../config';
import { t } from '../i18n/id';
import { ScreenHeader } from './ScreenHeader';

/** Phase 1 privacy policy, adapted from the draft in docs/07-privasi.md §5. */
export function PrivacyScreen({ onBack }: { onBack: () => void }) {
  const p = t.privacy;
  return (
    <main class="screen privacy">
      <ScreenHeader title={p.title} onBack={onBack} />
      <p class="note">{p.updated(PRIVACY_UPDATED)}</p>
      <p>{p.intro}</p>
      {p.sections.map((s) => (
        <section key={s.heading}>
          <h3>{s.heading}</h3>
          <p>{s.body}</p>
        </section>
      ))}
      <h3>{p.contact}</h3>
      <p>
        {CONTACT_EMAIL ? <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> : p.contactMissing}
      </p>
      <p class="note">{p.footer}</p>
    </main>
  );
}
