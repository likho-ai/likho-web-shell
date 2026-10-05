import { act, screen } from '@testing-library/react';
import { Route, Routes } from 'react-router';

const loaded: string[] = [];
const seenProps: Record<string, unknown>[] = [];

vi.mock('@module-federation/enhanced/runtime', () => ({
  registerRemotes: () => {},
  loadRemote: async (key: string) => {
    loaded.push(key);
    return {
      default: (props: Record<string, unknown>) => {
        seenProps.push(props);
        return <p>Panel for {String(props.externalId ?? props.recordingId)}</p>;
      },
    };
  },
}));

import { resetRemotes } from '../src/lib/remotes';
import { EmbedTranscriptPage, readEmbedToken } from '../src/pages/Embed';
import { fakeApi, renderAt } from './helpers';

function page(path: string) {
  const { client } = fakeApi({ Me: () => null });
  return renderAt(
    path,
    <Routes>
      <Route
        path="/embed/recordings/:ref"
        element={<EmbedTranscriptPage apiOrigin="http://x" manifestUrl="/mfe/manifest.json" />}
      />
    </Routes>,
    client,
  );
}

describe('the embedded transcript page', () => {
  beforeEach(() => {
    resetRemotes();
    loaded.length = 0;
    seenProps.length = 0;
    vi.stubGlobal('fetch', async () => new Response('', { status: 404 }));
  });
  afterEach(() => vi.unstubAllGlobals());

  it('reads the token from the fragment, never the server, and mounts the panel for the call', async () => {
    expect(readEmbedToken('#token=lt_abc', '')).toBe('lt_abc');
    expect(readEmbedToken('', '?token=lt_q')).toBe('lt_q');
    expect(readEmbedToken('#x=1', '?y=2')).toBe('');

    // A component that suspends with use() must be rendered inside an awaited act().
    await act(async () => {
      page('/embed/recordings/d000-call?t=12#token=lt_abc');
    });
    expect(await screen.findByText('Panel for d000-call')).toBeInTheDocument();
    expect(loaded).toEqual(['transcript/TranscriptPanel']);
    expect(seenProps[0]).toEqual({ externalId: 'd000-call', startAt: 12 });

    await act(async () => {
      page('/embed/recordings/rec_1#token=lt_abc');
    });
    expect(await screen.findByText('Panel for rec_1')).toBeInTheDocument();
    expect(seenProps.at(-1)).toEqual({ recordingId: 'rec_1', startAt: 0 });
  });

  it('asks for a token when there is none', async () => {
    page('/embed/recordings/d000-call');
    expect(await screen.findByRole('alert')).toHaveTextContent('needs a token');
    expect(loaded).toEqual([]);
  });
});
