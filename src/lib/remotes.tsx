/**
 * The apps the shell loads at run time (Module Federation).
 *
 * /mfe/manifest.json names each app's remote entry:
 *   { "library": "/mfe/library/remoteEntry.js", "transcript": "/mfe/transcript/remoteEntry.js" }
 * Releasing or rolling back one app changes one line there. An app that cannot be loaded shows
 * a message in its area with a retry; the rest of the shell keeps working.
 */
import { loadRemote, registerRemotes } from '@module-federation/enhanced/runtime';
import { Button } from '@likho-ai/ui';
import { Component, lazy, Suspense, type ComponentType, type ReactNode } from 'react';

export type RemoteName = 'library' | 'transcript';

const DEFAULTS: Record<RemoteName, string> = {
  library: '/mfe/library/remoteEntry.js',
  transcript: '/mfe/transcript/remoteEntry.js',
};

let registered: Promise<Record<RemoteName, string>> | null = null;

/** Reads the manifest once and registers every app with the federation runtime. */
export function registerFromManifest(
  manifestUrl: string,
  fetchImpl: typeof fetch = fetch,
): Promise<Record<RemoteName, string>> {
  if (!registered) {
    registered = (async () => {
      let entries = { ...DEFAULTS };
      try {
        const response = await fetchImpl(manifestUrl, { cache: 'no-store' });
        if (response.ok)
          entries = { ...entries, ...((await response.json()) as Partial<Record<RemoteName, string>>) };
      } catch {
        /* the defaults are the development layout */
      }
      registerRemotes(
        (Object.keys(entries) as RemoteName[]).map((name) => ({
          name,
          entry: entries[name],
          type: 'module',
        })),
      );
      return entries;
    })();
  }
  return registered;
}

/** For tests: forget the manifest. */
export function resetRemotes(): void {
  registered = null;
}

class RemoteBoundary extends Component<{ name: string; children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div role="alert" className="rounded-card border border-line bg-surface p-6 shadow-card">
          <p className="font-semibold">The {this.props.name} app could not be loaded.</p>
          <p className="mt-1 text-sm text-ink-2">{this.state.error.message}</p>
          <Button className="mt-4" onClick={() => this.setState({ error: null })}>
            Try again
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

const cache = new Map<string, ComponentType<Record<string, unknown>>>();

function remoteComponent(name: RemoteName, exposed: string, manifestUrl: string) {
  const key = `${name}/${exposed}`;
  let component = cache.get(key);
  if (!component) {
    component = lazy(async () => {
      await registerFromManifest(manifestUrl);
      const loaded = (await loadRemote<{ default: ComponentType<Record<string, unknown>> }>(key)) ?? null;
      if (!loaded?.default) throw new Error(`${key} has no default export`);
      return { default: loaded.default };
    });
    cache.set(key, component);
  }
  return component;
}

export function Skeleton({ label }: { label: string }) {
  return (
    <div className="animate-pulse space-y-3" aria-busy="true" aria-label={label}>
      <div className="h-8 w-1/3 rounded-input bg-surface-2" />
      <div className="h-40 rounded-card bg-surface-2" />
      <div className="h-40 rounded-card bg-surface-2" />
    </div>
  );
}

/** Mounts one exposed module of an app, with loading and failure states. */
export function Remote({
  name,
  exposed = 'App',
  manifestUrl,
  props = {},
}: {
  name: RemoteName;
  exposed?: string;
  manifestUrl: string;
  props?: Record<string, unknown>;
}) {
  const Loaded = remoteComponent(name, exposed, manifestUrl);
  return (
    <RemoteBoundary name={name}>
      <Suspense fallback={<Skeleton label={`Loading the ${name} app`} />}>
        <Loaded {...props} />
      </Suspense>
    </RemoteBoundary>
  );
}
