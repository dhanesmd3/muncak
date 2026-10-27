import { useState } from 'preact/hooks';
import { api } from '../api/client';
import { t } from '../i18n/id';

/** "Usulkan jawaban ini": sends an unknown answer to the editors' review queue. */
export function SuggestButton({ promptId, input }: { promptId: string; input: string }) {
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle');
  if (state === 'sent') return <p class="note">✓ {t.reveal.suggested}</p>;
  return (
    <>
      <button
        class="btn btn-ghost btn-suggest"
        disabled={state === 'sending'}
        onClick={() => {
          setState('sending');
          api.suggest(promptId, input).then(
            () => setState('sent'),
            () => setState('failed'),
          );
        }}
      >
        {t.reveal.suggest(input)}
      </button>
      {state === 'failed' && <p class="note">{t.reveal.suggestFailed}</p>}
    </>
  );
}
