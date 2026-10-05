/**
 * The transcript of one call for another system's page (an iframe in a reports portal): no
 * sign-in, no navigation. The portal's backend exchanged its API key for a short-lived viewer
 * token; the token travels in the address fragment (#token=…), which never reaches a server.
 *
 *   /embed/recordings/<rec_… or the dialer's id>#token=lt_…      ?t=<seconds>  ?theme=light|dark
 */
import { LikhoProvider } from '@likho-ai/web-sdk';
import { useEffect, useMemo } from 'react';
import { useLocation, useParams } from 'react-router';
import { Remote } from '../lib/remotes';
import { useTheme } from '../lib/theme';

/** The token from the fragment (preferred) or the query. */
export function readEmbedToken(hash: string, search: string): string {
  const fragment = new URLSearchParams(hash.replace(/^#/, ''));
  const query = new URLSearchParams(search);
  return (fragment.get('token') ?? query.get('token') ?? '').trim();
}

export function EmbedTranscriptPage({ apiOrigin, manifestUrl }: { apiOrigin: string; manifestUrl: string }) {
  const { ref = '' } = useParams<{ ref: string }>();
  const location = useLocation();
  const token = useMemo(
    () => readEmbedToken(location.hash, location.search),
    [location.hash, location.search],
  );
  const query = new URLSearchParams(location.search);
  const startAt = Math.max(0, Number(query.get('t')) || 0);
  const wanted = query.get('theme');
  const { setTheme } = useTheme();
  useEffect(() => {
    if (wanted === 'light' || wanted === 'dark') setTheme(wanted);
  }, [wanted, setTheme]);

  if (!token) {
    return (
      <main className="p-4">
        <p role="alert" className="rounded-card border border-line bg-surface p-5 text-ink-2 shadow-card">
          This page needs a token from the system that embeds it.
        </p>
      </main>
    );
  }
  const props = ref.startsWith('rec_') ? { recordingId: ref, startAt } : { externalId: ref, startAt };
  return (
    <LikhoProvider baseUrl={apiOrigin} token={token}>
      <main className="mx-auto max-w-[1240px] p-4" data-embed="transcript">
        <Remote name="transcript" exposed="TranscriptPanel" manifestUrl={manifestUrl} props={props} />
      </main>
    </LikhoProvider>
  );
}
