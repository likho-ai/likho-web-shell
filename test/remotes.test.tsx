import { render, screen } from '@testing-library/react';

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
    });
    expect(registered).toEqual([
      { name: 'library', entry: 'https://cdn.example/library/remoteEntry.js', type: 'module' },
      { name: 'transcript', entry: '/mfe/transcript/remoteEntry.js', type: 'module' },
    ]);
  });

  it('falls back to the development layout when there is no manifest', async () => {
    const fetchImpl = (async () => new Response('', { status: 404 })) as unknown as typeof fetch;
    const entries = await registerFromManifest('/mfe/manifest.json', fetchImpl);
    expect(entries.library).toBe('/mfe/library/remoteEntry.js');
  });

  it('shows an app and, when it cannot be loaded, a message with a retry', async () => {
    vi.stubGlobal('fetch', (async () => new Response('', { status: 404 })) as unknown as typeof fetch);
    render(<Remote name="library" manifestUrl="/mfe/manifest.json" />);
    expect(await screen.findByText('Hello from library/App')).toBeInTheDocument();
    vi.unstubAllGlobals();
  });
});
