import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router';
import { Layout, RequireSession } from '../src/components/Layout';
import { InvitePage } from '../src/pages/Invite';
import { ForgotPage, ResetPage } from '../src/pages/Password';
import { fakeApi, person, renderAt } from './helpers';

function app() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="invite/:token" element={<InvitePage />} />
        <Route path="forgot" element={<ForgotPage />} />
        <Route path="reset/:token" element={<ResetPage />} />
        <Route element={<RequireSession />}>
          <Route path="recordings" element={<h1>Recordings</h1>} />
        </Route>
      </Route>
    </Routes>
  );
}

describe('people', () => {
  it('an invitation link shows whom it is for; accepting signs the person in', async () => {
    let signedIn = false;
    const { client, calls } = fakeApi({
      Me: () => (signedIn ? { me: { ...person, role: 'viewer', email: 'v@example.test' } } : null),
      Invitation: (v) =>
        v.token === 'good'
          ? {
              invitation: {
                email: 'v@example.test',
                name: 'Vee',
                role: 'viewer',
                workspace: 'Test workspace',
              },
            }
          : new Error('This invitation link is not valid any more.'),
      AcceptInvitation: (v) => {
        signedIn = true;
        return { acceptInvitation: { ...person, role: 'viewer', email: 'v@example.test', name: v.name } };
      },
    });
    renderAt('/invite/good', app(), client);
    expect(await screen.findByRole('heading', { name: 'Join Test workspace' })).toBeInTheDocument();
    expect(screen.getByText(/invited as a viewer/)).toBeInTheDocument();

    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Your name'), 'Vee Viewer');
    await user.type(screen.getByLabelText('Choose a password'), 'viewer-password-1');
    await user.click(screen.getByRole('button', { name: 'Join and sign in' }));
    expect(await screen.findByRole('heading', { name: 'Recordings' })).toBeInTheDocument();
    expect(calls.find((c) => c.name === 'AcceptInvitation')!.variables).toEqual({
      token: 'good',
      name: 'Vee Viewer',
      password: 'viewer-password-1',
    });
    // A viewer: the sections, but no upload button and no Admin.
    expect(await screen.findByRole('link', { name: 'Search' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Upload call' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Admin' })).not.toBeInTheDocument();
  });

  it('a used-up invitation link says so', async () => {
    const { client } = fakeApi({
      Me: () => null,
      Invitation: () => new Error('This invitation link is not valid any more.'),
    });
    renderAt('/invite/stale', app(), client);
    expect(await screen.findByRole('alert')).toHaveTextContent('This link does not work any more.');
    expect(screen.getByRole('link', { name: 'Sign in instead' })).toHaveAttribute('href', '/login');
  });

  it('an admin sees the Admin section', async () => {
    const { client } = fakeApi({ Me: () => ({ me: person }) });
    renderAt('/recordings', app(), client);
    expect(await screen.findByRole('link', { name: 'Admin' })).toHaveAttribute('href', '/admin');
    expect(screen.getByRole('button', { name: 'Upload call' })).toBeInTheDocument();
  });

  it('a forgotten password asks for the address and always says a link is on its way', async () => {
    const { client, calls } = fakeApi({
      Me: () => null,
      RequestPasswordReset: () => ({ requestPasswordReset: true }),
    });
    renderAt('/forgot', app(), client);
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText('Email'), 'nobody@example.test');
    await user.click(screen.getByRole('button', { name: 'Send me a link' }));
    expect(await screen.findByRole('status')).toHaveTextContent(
      'a link to choose a new password is on its way',
    );
    expect(calls.find((c) => c.name === 'RequestPasswordReset')!.variables).toEqual({
      email: 'nobody@example.test',
    });
  });

  it('a reset link takes a new password and signs the person in; a stale one says so', async () => {
    let signedIn = false;
    const { client } = fakeApi({
      Me: () => (signedIn ? { me: person } : null),
      ResetPassword: (v) => {
        if (v.token !== 'fresh') {
          const error = new Error('This reset link is not valid any more.');
          return error;
        }
        signedIn = true;
        return { resetPassword: person };
      },
    });
    renderAt('/reset/fresh', app(), client);
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText('New password'), 'new-password-1');
    await user.click(screen.getByRole('button', { name: 'Save and sign in' }));
    expect(await screen.findByRole('heading', { name: 'Recordings' })).toBeInTheDocument();
  });
});
