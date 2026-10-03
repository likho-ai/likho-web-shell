import { Button } from '@likho-ai/ui';
import {
  useApiKeys,
  useCreateApiKey,
  useEngines,
  useMe,
  useRevokeApiKey,
  useSettings,
  useUpdateSettings,
} from '@likho-ai/web-sdk';
import { useState, type FormEvent } from 'react';
import { useTheme, type Theme } from '../lib/theme';

export function SettingsPage() {
  const me = useMe();
  const settings = useSettings();
  const update = useUpdateSettings();
  const engines = useEngines();
  const keys = useApiKeys();
  const createKey = useCreateApiKey();
  const revokeKey = useRevokeApiKey();
  const { theme, setTheme } = useTheme();
  const [keyName, setKeyName] = useState('');
  const [shownKey, setShownKey] = useState<string | null>(null);
  const admin = me.data?.role === 'admin';

  const makeKey = (event: FormEvent) => {
    event.preventDefault();
    if (!keyName.trim()) return;
    createKey.mutate(
      { name: keyName.trim() },
      {
        onSuccess: (data) => {
          setShownKey(data.createApiKey.key);
          setKeyName('');
        },
      },
    );
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="mt-2 text-ink-2">
          Workspace <span className="font-medium text-ink">{me.data?.workspace.name}</span>, signed in as{' '}
          {me.data?.email} ({me.data?.role}).
        </p>
      </div>

      <section
        className="rounded-card border border-line bg-surface p-6 shadow-card"
        aria-labelledby="transcription"
      >
        <h2 id="transcription" className="text-xl font-bold">
          Transcription
        </h2>
        <label className="mt-4 flex items-start gap-3">
          <input
            type="checkbox"
            className="mt-1 size-5 accent-[var(--likho-accent)]"
            checked={settings.data?.autoTranscribe ?? true}
            disabled={!admin || settings.isPending || update.isPending}
            onChange={(e) => update.mutate({ autoTranscribe: e.target.checked })}
          />
          <span>
            <span className="font-medium">Transcribe every recording as soon as it is ready</span>
            <span className="block text-sm text-ink-2">
              Off: recordings wait until someone presses Transcribe.
              {!admin && ' Only an admin can change this.'}
            </span>
          </span>
        </label>
        <p className="mt-4 text-sm text-ink-2">
          Models the workers can run:{' '}
          {(engines.data ?? []).map((e) => (
            <span key={e.registryId} className="mr-2 font-mono text-xs">
              {e.registryId}
              {e.isDefault ? ' (default)' : ''}
            </span>
          ))}
          {engines.isError && <span>not known right now (the transcription service is not answering).</span>}
        </p>
      </section>

      <section
        className="rounded-card border border-line bg-surface p-6 shadow-card"
        aria-labelledby="appearance"
      >
        <h2 id="appearance" className="text-xl font-bold">
          Appearance
        </h2>
        <div className="mt-4 flex gap-2" role="radiogroup" aria-label="Theme">
          {(['system', 'light', 'dark'] as Theme[]).map((option) => (
            <Button
              key={option}
              role="radio"
              aria-checked={theme === option}
              variant={theme === option ? 'primary' : 'secondary'}
              onClick={() => setTheme(option)}
            >
              {option[0]!.toUpperCase() + option.slice(1)}
            </Button>
          ))}
        </div>
      </section>

      {admin && (
        <section
          className="rounded-card border border-line bg-surface p-6 shadow-card"
          aria-labelledby="keys"
        >
          <h2 id="keys" className="text-xl font-bold">
            API keys
          </h2>
          <p className="mt-1 text-sm text-ink-2">
            For scripts and connectors: <code className="font-mono text-xs">Authorization: Bearer lk_…</code>{' '}
            on the REST API (/api/docs).
          </p>
          <form onSubmit={makeKey} className="mt-4 flex flex-wrap gap-2">
            <input
              aria-label="Name of the new key"
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
              placeholder="dialer connector"
              className="min-h-11 flex-1 rounded-input border border-line-strong bg-surface px-3 text-ink focus-visible:outline-accent"
            />
            <Button type="submit" variant="primary" disabled={createKey.isPending}>
              Make a key
            </Button>
          </form>
          {shownKey && (
            <p className="mt-3 rounded-input bg-surface-2 px-3 py-2 text-sm">
              Copy it now; it is not shown again: <code className="font-mono select-all">{shownKey}</code>
            </p>
          )}
          <ul className="mt-4 divide-y divide-line text-sm">
            {(keys.data ?? []).map((key) => (
              <li key={key.id} className="flex items-center justify-between py-2">
                <span>
                  <span className="font-medium">{key.name}</span>
                  <span className="ml-2 text-ink-3">
                    {key.revokedAt
                      ? 'revoked'
                      : key.lastUsedAt
                        ? `last used ${new Date(key.lastUsedAt).toLocaleString()}`
                        : 'never used'}
                  </span>
                </span>
                {!key.revokedAt && (
                  <Button variant="ghost" size="sm" onClick={() => revokeKey.mutate({ id: key.id })}>
                    Revoke
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
