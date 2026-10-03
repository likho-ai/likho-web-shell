import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router';
import { Layout, RequireSession } from '../src/components/Layout';
import { LoginPage } from '../src/pages/Login';
import { fakeApi, person, renderAt } from './helpers';

const Protected = () => <h1>Protected page</h1>;

function app() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<h1>Home</h1>} />
        <Route path="login" element={<LoginPage />} />
        <Route element={<RequireSession />}>
          <Route path="recordings" element={<Protected />} />
        </Route>
      </Route>
    </Routes>
  );
}

describe('the shell', () => {
  it('shows the home page to a visitor, without the section links', async () => {
    const { client } = fakeApi({ Me: () => null });
    renderAt('/', app(), client);
    expect(await screen.findByRole('heading', { name: 'Home' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument());
    expect(screen.queryByRole('link', { name: 'Recordings' })).not.toBeInTheDocument();
  });

  it('sends a visitor of a protected page to sign in, and back after', async () => {
    let signedIn = false;
    const { client } = fakeApi({
      Me: () => (signedIn ? { me: person } : null),
      Login: (v) => {
        if (v.password !== 'right-password') return new Error('The email or the password is wrong.');
        signedIn = true;
        return { login: person };
      },
    });
    renderAt('/recordings', app(), client);
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();

    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Email'), 'a@example.test');
    await user.type(screen.getByLabelText('Password'), 'wrong-password');
    await user.click(screen.getByRole('form', { name: 'Sign in' }).querySelector('button[type=submit]')!);
    expect(await screen.findByRole('alert')).toHaveTextContent('The email or the password is wrong.');

    await user.clear(screen.getByLabelText('Password'));
    await user.type(screen.getByLabelText('Password'), 'right-password');
    await user.click(screen.getByRole('form', { name: 'Sign in' }).querySelector('button[type=submit]')!);
    expect(await screen.findByRole('heading', { name: 'Protected page' })).toBeInTheDocument();
    // Signed in: the sections and the upload button are in the bar.
    expect(await screen.findByRole('link', { name: 'Recordings' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Upload call' })).toBeInTheDocument();
  });

  it('switches the theme and remembers it', async () => {
    const { client } = fakeApi({ Me: () => null });
    renderAt('/', app(), client);
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Switch to dark mode' }));
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('likho:theme')).toBe('dark');
    await user.click(screen.getByRole('button', { name: 'Switch to light mode' }));
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });
});
