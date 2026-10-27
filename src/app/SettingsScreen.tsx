import type { Settings } from '../storage/settings';
import { t } from '../i18n/id';
import { ScreenHeader } from './ScreenHeader';

type ToggleKey = 'sound' | 'music' | 'vibrate' | 'reducedMotion' | 'highContrast';
const TOGGLES: ToggleKey[] = ['sound', 'music', 'vibrate', 'reducedMotion', 'highContrast'];

interface Props {
  settings: Settings;
  onChange: (next: Settings) => void;
  onDeleteData: () => void;
  /** Shown when the server part of "Hapus data saya" failed. */
  error?: string;
  onPrivacy: () => void;
  onBack: () => void;
}

export function SettingsScreen({
  settings,
  onChange,
  onDeleteData,
  error,
  onPrivacy,
  onBack,
}: Props) {
  return (
    <main class="screen settings">
      <ScreenHeader title={t.settings.title} onBack={onBack} />
      <ul class="toggles">
        {TOGGLES.map((key) => (
          <li key={key}>
            <button
              class="toggle"
              role="switch"
              aria-checked={settings[key]}
              onClick={() => onChange({ ...settings, [key]: !settings[key] })}
            >
              <span>{t.settings[key]}</span>
              <span class="toggle-knob" aria-hidden="true">
                {settings[key] ? t.settings.on : t.settings.off}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <button class="btn btn-wide" onClick={onPrivacy}>
        {t.settings.privacy}
      </button>
      <button
        class="btn btn-danger btn-wide"
        onClick={() => {
          if (window.confirm(t.settings.deleteConfirm)) onDeleteData();
        }}
      >
        {t.settings.deleteData}
      </button>
      {error && (
        <p class="form-error" role="alert">
          {error}
        </p>
      )}
    </main>
  );
}
