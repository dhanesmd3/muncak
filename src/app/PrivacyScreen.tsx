import { API_ENABLED } from '../api/client';
import { CONTACT_EMAIL, PRIVACY_UPDATED } from '../config';
import { t } from '../i18n/id';
import { ScreenHeader } from './ScreenHeader';

/** Privacy policy from docs/07-privasi.md §5; the phase 1 version while there is no backend. */
export function PrivacyScreen({ onBack }: { onBack: () => void }) {
  const p = t.privacy;
  return (
    <main class="screen privacy">
      <ScreenHeader title={p.title} onBack={onBack} />
      <p class="note">{p.updated(PRIVACY_UPDATED)}</p>
      <p>{p.intro}</p>
      {(API_ENABLED ? p.sectionsWithServer : p.sections).map((s) => (
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
