import { Button, Mascot } from '@likho-ai/ui';
import { useLogin, useMe } from '@likho-ai/web-sdk';
import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';

export function LoginPage() {
  const me = useMe();
  const login = useLogin();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const back = (location.state as { from?: string } | null)?.from ?? '/recordings';

  if (me.data) return <Navigate to={back} replace />;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    login.mutate({ email, password }, { onSuccess: () => navigate(back, { replace: true }) });
  };

  return (
    <div className="mx-auto mt-6 grid max-w-4xl gap-8 md:grid-cols-[1fr_1.1fr] md:items-center">
      <div className="hidden md:block">
        <Mascot pose="idle" size={200} />
        <p className="mt-4 max-w-sm text-ink-2">
          <span lang="hi" className="font-medium text-ink">
            आप बोलिए, मैं लिख लेता हूँ।
          </span>
          <br />
          Aap boliye, main likh leta hoon.
        </p>
      </div>
      <form
        onSubmit={submit}
        className="rounded-card border border-line bg-surface p-6 shadow-card sm:p-8"
        aria-labelledby="login-title"
      >
        <h1 id="login-title" className="text-2xl font-bold">
          Sign in
        </h1>
        <p className="mt-1 text-sm text-ink-2">Your workspace, your calls, your words.</p>
        <label className="mt-6 block text-sm font-medium" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-input border border-line-strong bg-surface px-3 py-2.5 text-ink focus-visible:outline-accent"
        />
        <label className="mt-4 block text-sm font-medium" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-input border border-line-strong bg-surface px-3 py-2.5 text-ink focus-visible:outline-accent"
        />
        {login.error && (
          <p
            role="alert"
            className="mt-3 rounded-input bg-[var(--likho-status-failed)] px-3 py-2 text-sm text-[var(--likho-status-failed-ink)]"
          >
            {login.error.message}
          </p>
        )}
        <Button type="submit" variant="primary" className="mt-6 w-full" disabled={login.isPending}>
          {login.isPending ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </div>
  );
}
