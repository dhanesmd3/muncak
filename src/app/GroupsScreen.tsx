import { useEffect, useState } from 'preact/hooks';
import { ApiError, api, trackEvent } from '../api/client';
import { flushPendingPlay } from '../api/sync';
import { NAME_MAX_LENGTH } from '../game/constants';
import { parseGroupCode, type GroupView, type MyGroup } from '../game/groups';
import { reachedMountain } from '../game/scoring';
import type { Mountain } from '../game/types';
import { t } from '../i18n/id';
import { copyText, shareResult } from '../share/share';
import { ScreenHeader } from './ScreenHeader';

function errorText(e: unknown): string {
  if (e instanceof ApiError) return t.groups.errors[e.code] ?? t.groups.errors.generic!;
  return t.groups.offline;
}

const groupUrl = (code: string) => `${location.origin}${import.meta.env.BASE_URL}r/${code}`;

interface NameFieldProps {
  id: string;
  label: string;
  value: string;
  placeholder?: string;
  hint?: string;
  onInput: (v: string) => void;
}

function NameField({ id, label, value, placeholder, hint, onInput }: NameFieldProps) {
  return (
    <div class="field">
      <label for={id}>{label}</label>
      <input
        id={id}
        class="text-input"
        type="text"
        value={value}
        maxLength={NAME_MAX_LENGTH}
        placeholder={placeholder}
        autocomplete="off"
        aria-describedby={hint ? `${id}-hint` : undefined}
        onInput={(e) => onInput((e.target as HTMLInputElement).value)}
      />
      {hint && (
        <p class="note" id={`${id}-hint`}>
          {hint}
        </p>
      )}
    </div>
  );
}

interface ListProps {
  groups: MyGroup[];
  setGroups: (g: MyGroup[]) => void;
  onOpen: (code: string) => void;
  onBack: () => void;
}

export function GroupsScreen({ groups, setGroups, onOpen, onBack }: ListProps) {
  const lastNick = groups[0]?.nickname ?? '';
  const [name, setName] = useState('');
  const [nick, setNick] = useState(lastNick);
  const [code, setCode] = useState('');
  const [joinNick, setJoinNick] = useState(lastNick);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const add = (g: MyGroup) => setGroups([g, ...groups.filter((x) => x.code !== g.code)]);

  const create = async (e: Event) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const g = await api.createGroup(name, nick);
      add({ code: g.code, name: g.name, nickname: nick.trim() });
      trackEvent('group_created');
      onOpen(g.code);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const join = async (e: Event) => {
    e.preventDefault();
    const parsed = parseGroupCode(code);
    if (!parsed) {
      setError(t.groups.errors.bad_code!);
      return;
    }
    setBusy(true);
    setError('');
    try {
      const g = await api.joinGroup(parsed, joinNick);
      add({ code: g.code, name: g.name, nickname: joinNick.trim() });
      onOpen(g.code);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main class="screen groups">
      <ScreenHeader title={t.groups.title} onBack={onBack} />
      <p>{t.groups.intro}</p>

      <h3>{t.groups.mine}</h3>
      {groups.length === 0 ? (
        <p class="note">{t.groups.none}</p>
      ) : (
        <ul class="group-list">
          {groups.map((g) => (
            <li key={g.code}>
              <button class="btn btn-wide group-item" onClick={() => onOpen(g.code)}>
                <span>⛺ {g.name}</span>
                <span class="note">{g.code}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && (
        <p class="form-error" role="alert">
          {error}
        </p>
      )}

      <form class="panel form" onSubmit={create}>
        <h3>{t.groups.create}</h3>
        <NameField
          id="group-name"
          label={t.groups.groupName}
          value={name}
          placeholder={t.groups.groupNamePlaceholder}
          onInput={setName}
        />
        <NameField
          id="group-nick"
          label={t.groups.nickname}
          value={nick}
          hint={t.groups.nicknameHint}
          onInput={setNick}
        />
        <button class="btn btn-primary btn-wide" disabled={busy || !name.trim() || !nick.trim()}>
          {t.groups.create}
        </button>
      </form>

      <form class="panel form" onSubmit={join}>
        <h3>{t.groups.joinByCode}</h3>
        <NameField
          id="join-code"
          label={t.groups.code}
          value={code}
          placeholder={t.groups.codePlaceholder}
          onInput={setCode}
        />
        <NameField
          id="join-nick"
          label={t.groups.nickname}
          value={joinNick}
          hint={t.groups.nicknameHint}
          onInput={setJoinNick}
        />
        <button class="btn btn-wide" disabled={busy || !code.trim() || !joinNick.trim()}>
          {t.groups.join}
        </button>
      </form>
    </main>
  );
}

interface DetailProps {
  code: string;
  groups: MyGroup[];
  setGroups: (g: MyGroup[]) => void;
  mountains: readonly Mountain[];
  onBack: () => void;
}

export function GroupScreen({ code, groups, setGroups, mountains, onBack }: DetailProps) {
  const [view, setView] = useState<GroupView | null>(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'today' | 'week'>('today');
  const [nick, setNick] = useState(groups[0]?.nickname ?? '');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let alive = true;
    setError('');
    // Make sure our own score has reached the server before asking for standings.
    flushPendingPlay()
      .then(() => api.group(code))
      .then((v) => {
        if (!alive) return;
        setView(v);
        // Removed on the server (left elsewhere, or deleted after 90 inactive days).
        if (!v.isMember && groups.some((g) => g.code === code)) {
          setGroups(groups.filter((g) => g.code !== code));
        }
      })
      .catch((e: unknown) => alive && setError(errorText(e)));
    return () => {
      alive = false;
    };
  }, [code, reload]);

  if (error && !view) {
    return (
      <main class="screen group">
        <ScreenHeader title={t.groups.title} onBack={onBack} />
        <p class="form-error" role="alert">
          {error}
        </p>
      </main>
    );
  }
  if (!view) {
    return (
      <main class="screen group">
        <ScreenHeader title={t.groups.title} onBack={onBack} />
        <p class="note">{t.groups.loading}</p>
      </main>
    );
  }

  if (!view.isMember) {
    const join = async (e: Event) => {
      e.preventDefault();
      setBusy(true);
      setError('');
      try {
        const g = await api.joinGroup(code, nick);
        setGroups([
          { code: g.code, name: g.name, nickname: nick.trim() },
          ...groups.filter((x) => x.code !== g.code),
        ]);
        setReload((n) => n + 1);
      } catch (err) {
        setError(errorText(err));
      } finally {
        setBusy(false);
      }
    };
    return (
      <main class="screen group">
        <ScreenHeader title={t.groups.title} onBack={onBack} />
        <form class="panel form" onSubmit={join}>
          <h3>{t.groups.joinTitle(view.name)}</h3>
          <p class="note">
            {view.code} · {t.groups.members(view.memberCount)}
          </p>
          <NameField
            id="detail-nick"
            label={t.groups.nickname}
            value={nick}
            hint={t.groups.nicknameHint}
            onInput={setNick}
          />
          {error && (
            <p class="form-error" role="alert">
              {error}
            </p>
          )}
          <button class="btn btn-primary btn-wide" disabled={busy || !nick.trim()}>
            {t.groups.join}
          </button>
        </form>
      </main>
    );
  }

  const rows = tab === 'today' ? view.members : [...view.members].sort((a, b) => b.week - a.week);
  const share = async () => {
    const url = groupUrl(view.code);
    const res = await shareResult(t.groups.shareText(view.name, url));
    if (res === 'copied' || (res === 'failed' && (await copyText(url)))) {
      setToast(t.groups.linkCopied);
      setTimeout(() => setToast(''), 2500);
    }
  };
  const leave = async () => {
    if (!window.confirm(t.groups.leaveConfirm(view.name))) return;
    try {
      await api.leaveGroup(view.code);
      setGroups(groups.filter((g) => g.code !== view.code));
      onBack();
    } catch (err) {
      setError(errorText(err));
    }
  };

  return (
    <main class="screen group">
      <ScreenHeader title={view.name} onBack={onBack} />
      <p class="note">
        ⛺ {view.code} · {t.groups.members(view.memberCount)}
      </p>
      <div class="tabs" role="tablist">
        {(['today', 'week'] as const).map((k) => (
          <button
            key={k}
            role="tab"
            aria-selected={tab === k}
            class={`tab ${tab === k ? 'tab-active' : ''}`}
            onClick={() => setTab(k)}
          >
            {k === 'today' ? t.groups.today : t.groups.week}
          </button>
        ))}
      </div>
      {tab === 'today' && !view.revealed && <p class="note">{t.groups.hiddenUntilPlayed}</p>}
      <ol class="standings">
        {rows.map((m, i) => {
          const label = m.isMe ? `${m.nickname} (${t.groups.you})` : m.nickname;
          let score: string;
          if (tab === 'week') score = t.mdpl(m.week);
          else if (m.today) {
            score = `${t.mdpl(m.today.altitude)} · ${reachedMountain(m.today.altitude, mountains).shortName}`;
          } else score = t.groups.notPlayed;
          return (
            <li key={`${m.nickname}-${i}`} class={m.isMe ? 'me' : ''}>
              <span class="rank">{i + 1}.</span>
              <span class="nick">{label}</span>
              <span class="score">{score}</span>
            </li>
          );
        })}
      </ol>
      {tab === 'today' && view.edelweissFinders.length > 0 && (
        <p>{t.groups.edelweissToday(view.edelweissFinders.join(', '))}</p>
      )}
      {error && (
        <p class="form-error" role="alert">
          {error}
        </p>
      )}
      <p class="toast" role="status" aria-live="polite">
        {toast}
      </p>
      <div class="actions">
        <button class="btn btn-primary btn-wide" onClick={share}>
          📤 {t.groups.shareLink}
        </button>
        <button class="btn btn-danger btn-wide" onClick={leave}>
          {t.groups.leave}
        </button>
      </div>
    </main>
  );
}
