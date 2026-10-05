/**
 * Forgotten passwords: /forgot asks for the address and mails a link; /reset/:token is the
 * page that link opens.
 */
import { Button } from '@likho-ai/ui';
import { LikhoError, useRequestPasswordReset, useResetPassword } from '@likho-ai/web-sdk';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { PasswordField } from '../components/PasswordField';

const card = 'mx-auto mt-6 max-w-md rounded-card border border-line bg-surface p-6 shadow-card sm:p-8';

export function ForgotPage() {
  const request = useRequestPasswordReset();
  const [email, setEmail] = useState('');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    request.mutate({ email });
  };

  if (request.isSuccess) {
    return (
      <div className={card} role="status">
        <h1 className="text-2xl font-bold">Check your mail</h1>
        <p className="mt-2 text-ink-2">
          If <span className="font-medium text-ink">{email}</span> has an account, a link to choose a new
          password is on its way. It works for two hours.
        </p>
        <p className="mt-2 text-sm text-ink-3">
          No mail? Ask an admin of your workspace: they can send you a new invitation.
        </p>
        <Button className="mt-6" asChild>
          <Link to="/login">Back to sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className={card} aria-labelledby="forgot-title">
      <h1 id="forgot-title" className="text-2xl font-bold">
        Forgotten your password?
      </h1>
      <p className="mt-1 text-sm text-ink-2">Say which address you sign in with; a link comes by mail.</p>
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
      {request.error && (
        <p role="alert" className="mt-3 text-sm text-[var(--likho-status-failed-ink)]">
          {request.error.message}
        </p>
      )}
      <Button type="submit" variant="primary" className="mt-6 w-full" disabled={request.isPending}>
        {request.isPending ? 'Sending…' : 'Send me a link'}
      </Button>
      <p className="mt-4 text-center text-sm">
        <Link to="/login" className="text-ink-2 underline-offset-2 hover:underline">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}

export function ResetPage() {
  const { token = '' } = useParams();
  const reset = useResetPassword();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const stale = reset.error instanceof LikhoError && reset.error.code === 'not_found';

  const submit = (event: FormEvent) => {
    event.preventDefault();
    reset.mutate({ token, password }, { onSuccess: () => navigate('/recordings', { replace: true }) });
  };

  return (
    <form onSubmit={submit} className={card} aria-labelledby="reset-title">
      <h1 id="reset-title" className="text-2xl font-bold">
        Choose a new password
      </h1>
      <p className="mt-1 text-sm text-ink-2">Every other session of yours ends; you are signed in here.</p>
      <PasswordField
        id="password"
        label="New password"
        autoComplete="new-password"
        value={password}
        onChange={setPassword}
      />
      {reset.error && (
        <p
          role="alert"
          className="mt-3 rounded-input bg-[var(--likho-status-failed)] px-3 py-2 text-sm text-[var(--likho-status-failed-ink)]"
        >
          {stale ? 'This link does not work any more. Ask for a new one.' : reset.error.message}
        </p>
      )}
      <Button type="submit" variant="primary" className="mt-6 w-full" disabled={reset.isPending}>
        {reset.isPending ? 'Saving…' : 'Save and sign in'}
      </Button>
      {stale && (
        <p className="mt-4 text-center text-sm">
          <Link to="/forgot" className="text-ink-2 underline-offset-2 hover:underline">
            Ask for a new link
          </Link>
        </p>
      )}
    </form>
  );
}
