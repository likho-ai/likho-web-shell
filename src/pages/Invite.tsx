/** /invite/:token - the page an invitation link opens: whom it is for, a name, a password. */
import { Button, Mascot } from '@likho-ai/ui';
import { useAcceptInvitation, useInvitation, useMe } from '@likho-ai/web-sdk';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { PasswordField } from '../components/PasswordField';

const ROLE_WORDS: Record<string, string> = {
  admin: 'an admin',
  member: 'a member',
  viewer: 'a viewer',
};

export function InvitePage() {
  const { token = '' } = useParams();
  const invitation = useInvitation(token || undefined);
  const accept = useAcceptInvitation();
  const me = useMe();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    accept.mutate(
      { token, name: name.trim() || invitation.data?.name || '', password },
      { onSuccess: () => navigate('/recordings', { replace: true }) },
    );
  };

  return (
    <div className="mx-auto mt-6 grid max-w-4xl gap-8 md:grid-cols-[1fr_1.1fr] md:items-center">
      <div className="hidden md:block">
        <Mascot pose="idle" size={200} />
        <p className="mt-4 max-w-sm text-ink-2">
          <span lang="hi" className="font-medium text-ink">
            आइए, शुरू करते हैं।
          </span>
          <br />
          Aaiye, shuru karte hain.
        </p>
      </div>
      <div className="rounded-card border border-line bg-surface p-6 shadow-card sm:p-8">
        {invitation.isPending && <p aria-busy="true">Looking at your invitation…</p>}
        {invitation.isError && (
          <div role="alert">
            <h1 className="text-2xl font-bold">This link does not work any more.</h1>
            <p className="mt-2 text-ink-2">
              An invitation works once and for seven days. Ask the person who invited you for a new one.
            </p>
            <Button className="mt-6" asChild>
              <Link to="/login">Sign in instead</Link>
            </Button>
          </div>
        )}
        {invitation.data && (
          <form onSubmit={submit} aria-labelledby="invite-title">
            <h1 id="invite-title" className="text-2xl font-bold">
              Join {invitation.data.workspace}
            </h1>
            <p className="mt-1 text-sm text-ink-2">
              You are invited as {ROLE_WORDS[invitation.data.role] ?? invitation.data.role}, as{' '}
              <span className="font-medium text-ink">{invitation.data.email}</span>.
              {me.data && me.data.email !== invitation.data.email && (
                <span className="block">
                  You are signed in as {me.data.email}; accepting signs you in anew.
                </span>
              )}
            </p>
            <label className="mt-6 block text-sm font-medium" htmlFor="name">
              Your name
            </label>
            <input
              id="name"
              autoComplete="name"
              required={!invitation.data.name}
              value={name}
              placeholder={invitation.data.name || undefined}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-input border border-line-strong bg-surface px-3 py-2.5 text-ink focus-visible:outline-accent"
            />
            <PasswordField
              id="password"
              label="Choose a password"
              autoComplete="new-password"
              value={password}
              onChange={setPassword}
            />
            {accept.error && (
              <p
                role="alert"
                className="mt-3 rounded-input bg-[var(--likho-status-failed)] px-3 py-2 text-sm text-[var(--likho-status-failed-ink)]"
              >
                {accept.error.message}
              </p>
            )}
            <Button type="submit" variant="primary" className="mt-6 w-full" disabled={accept.isPending}>
              {accept.isPending ? 'Joining…' : 'Join and sign in'}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
