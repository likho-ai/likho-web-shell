import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const registered: unknown[] = [];
const loaded: string[] = [];
let fail = false;

vi.mock('@module-federation/enhanced/runtime', () => ({
  registerRemotes: (remotes: unknown[]) => registered.push(...remotes),
  loadRemote: async (key: string) => {
    loaded.push(key);
    if (fail) throw new Error('remoteEntry.js: 502');
    return { default: () => <p>Hello from {key}</p> };
  },
}));

import { Remote, registerFromManifest, resetRemotes } from '../src/lib/remotes';

describe('remotes', () => {
  beforeEach(() => {
    resetRemotes();
    registered.length = 0;
    loaded.length = 0;
    fail = false;
  });

  it('registers the apps named in the manifest, with defaults for the rest', async () => {
    const fetchImpl = (async () =>
      new Response(
        JSON.stringify({ library: 'https://cdn.example/library/remoteEntry.js' }),
      )) as unknown as typeof fetch;
    const entries = await registerFromManifest('/mfe/manifest.json', fetchImpl);
    expect(entries).toEqual({
      library: 'https://cdn.example/library/remoteEntry.js',
      transcript: '/mfe/transcript/remoteEntry.js',
      admin: '/mfe/admin/remoteEntry.js',
      vocabulary: '/mfe/vocabulary/remoteEntry.js',
    });
    expect(registered).toEqual([
      { name: 'library', entry: 'https://cdn.example/library/remoteEntry.js', type: 'module' },
      { name: 'transcript', entry: '/mfe/transcript/remoteEntry.js', type: 'module' },
      { name: 'admin', entry: '/mfe/admin/remoteEntry.js', type: 'module' },
      { name: 'vocabulary', entry: '/mfe/vocabulary/remoteEntry.js', type: 'module' },
    ]);
  });

  it('falls back to the development layout when there is no manifest', async () => {
    const fetchImpl = (async () => new Response('', { status: 404 })) as unknown as typeof fetch;
    const entries = await registerFromManifest('/mfe/manifest.json', fetchImpl);
    expect(entries.library).toBe('/mfe/library/remoteEntry.js');
  });

  // A component that suspends with use() must be rendered inside an awaited act().
  it('shows an app', async () => {
    vi.stubGlobal('fetch', (async () => new Response('', { status: 404 })) as unknown as typeof fetch);
    await act(async () => {
      render(<Remote name="library" manifestUrl="/mfe/manifest.json" />);
    });
    expect(await screen.findByText('Hello from library/App')).toBeInTheDocument();
    expect(loaded).toEqual(['library/App']);
    vi.unstubAllGlobals();
  });

  it('shows a message when an app cannot be loaded, and loads it again on retry', async () => {
    vi.stubGlobal('fetch', (async () => new Response('', { status: 404 })) as unknown as typeof fetch);
    vi.spyOn(console, 'error').mockImplementation(() => {}); // React reports the caught error
    fail = true;
    await act(async () => {
      render(<Remote name="transcript" manifestUrl="/mfe/manifest.json" />);
    });
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('The transcript app could not be loaded.');
    expect(alert).toHaveTextContent('remoteEntry.js: 502');

    fail = false;
    await act(async () => {
      await userEvent.setup().click(screen.getByRole('button', { name: 'Try again' }));
    });
    expect(await screen.findByText('Hello from transcript/App')).toBeInTheDocument();
    expect(loaded).toEqual(['transcript/App', 'transcript/App']);
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });
});
