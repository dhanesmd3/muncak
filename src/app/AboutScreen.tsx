import { CONTACT_EMAIL, DONATION_URL } from '../config';
import { t } from '../i18n/id';
import { ScreenHeader } from './ScreenHeader';

export function AboutScreen({ onPrivacy, onBack }: { onPrivacy: () => void; onBack: () => void }) {
  return (
    <main class="screen about">
      <ScreenHeader title={t.about.title} onBack={onBack} />
      <p>{t.about.body}</p>
      <p>{t.about.gratis}</p>
      <h3>{t.about.fontsTitle}</h3>
      <p>{t.about.fonts}</p>
      <p class="note">{t.about.inspiration}</p>
      {CONTACT_EMAIL && (
        <p>
          {t.about.contact}: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        </p>
      )}
      {DONATION_URL && (
        <a class="btn btn-wide" href={DONATION_URL} target="_blank" rel="noopener noreferrer">
          {t.about.donate}
        </a>
      )}
      <button class="btn btn-wide" onClick={onPrivacy}>
        {t.about.privacy}
      </button>
    </main>
  );
}
