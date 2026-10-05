/** Your own settings: who you are, how the app looks, your password. The workspace's are under /admin. */
import { Button } from '@likho-ai/ui';
import { useChangePassword, useMe } from '@likho-ai/web-sdk';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { PasswordField } from '../components/PasswordField';
import { useTheme, type Theme } from '../lib/theme';

const ROLE_WORDS: Record<string, string> = {
  admin: 'an admin: you manage people, keys and settings',
  member: 'a member: you upload, transcribe and correct',
  viewer: 'a viewer: you read, play and search',
};

export function SettingsPage() {
  const me = useMe();
  const change = useChangePassword();
  const { theme, setTheme } = useTheme();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [changed, setChanged] = useState(false);
  const admin = me.data?.role === 'admin';

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setChanged(false);
    change.mutate(
      { currentPassword: current, newPassword: next },
      {
        onSuccess: () => {
          setChanged(true);
          setCurrent('');
          setNext('');
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
          {me.data?.email}, {ROLE_WORDS[me.data?.role ?? ''] ?? me.data?.role}.
          {admin && (
            <>
              {' '}
              People, API keys, the workspace settings and the audit log are under{' '}
              <Link to="/admin" className="font-medium text-ink underline-offset-2 hover:underline">
                Admin
              </Link>
              .
            </>
          )}
        </p>
      </div>

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

      <section
        className="rounded-card border border-line bg-surface p-6 shadow-card"
        aria-labelledby="password"
      >
        <h2 id="password" className="text-xl font-bold">
          Password
        </h2>
        <form onSubmit={submit} className="max-w-md" aria-label="Change password">
          <PasswordField
            id="current-password"
            label="Current password"
            autoComplete="current-password"
            value={current}
            onChange={setCurrent}
          />
          <PasswordField
            id="new-password"
            label="New password"
            autoComplete="new-password"
            value={next}
            onChange={setNext}
          />
          {change.error && (
            <p role="alert" className="mt-3 text-sm text-[var(--likho-status-failed-ink)]">
              {change.error.message}
            </p>
          )}
          {changed && (
            <p role="status" className="mt-3 text-sm text-ink-2">
              Your password is changed.
            </p>
          )}
          <Button type="submit" className="mt-4" disabled={change.isPending}>
            {change.isPending ? 'Saving…' : 'Change password'}
          </Button>
        </form>
      </section>
    </div>
  );
}
