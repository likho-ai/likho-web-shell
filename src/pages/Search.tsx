import { Button, Tag } from '@likho-ai/ui';
import {
  clock,
  useDeleteSavedSearch,
  useMe,
  useRecordingFacets,
  useSaveSearch,
  useSavedSearches,
  useSearch,
  type FacetValue,
  type SavedSearch,
  type SearchFilter,
} from '@likho-ai/web-sdk';
import { Bookmark, ChevronLeft, ChevronRight, Search as SearchIcon, X } from 'lucide-react';
import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router';

const input =
  'min-h-11 rounded-input border border-line-strong bg-surface px-3 text-ink focus-visible:outline-accent';
const PAGE_SIZE = 20;
const LANGUAGES: { code: string; label: string }[] = [
  { code: '', label: 'Any language' },
  { code: 'hi', label: 'Hindi' },
  { code: 'ur', label: 'Urdu' },
  { code: 'en', label: 'English' },
];

/** What narrows a search besides the words: everything lives in the address, so it can be shared. */
export interface Narrowing {
  lang: string;
  campaign: string;
  agent: string;
  disposition: string;
  from: string; // a date, YYYY-MM-DD, on the call time
  to: string;
}

const EMPTY: Narrowing = { lang: '', campaign: '', agent: '', disposition: '', from: '', to: '' };

/** The filter the API takes, from the narrowing: dates become the day's first and last moment. */
export function toFilter(n: Narrowing): SearchFilter {
  const filter: SearchFilter = {};
  if (n.lang) filter.language = n.lang;
  if (n.campaign) filter.campaign = n.campaign;
  if (n.agent) filter.agent = n.agent;
  if (n.disposition) filter.disposition = n.disposition;
  if (n.from) filter.callSince = new Date(`${n.from}T00:00:00`).toISOString();
  if (n.to) filter.callUntil = new Date(`${n.to}T23:59:59.999`).toISOString();
  return filter;
}

/** Back from a saved filter into the address's words. */
export function fromSaved(filter: SavedSearch['filter']): Narrowing {
  const day = (iso: string | null | undefined) => {
    if (!iso) return '';
    const date = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  };
  return {
    lang: filter.language ?? '',
    campaign: filter.campaign ?? '',
    agent: filter.agent ?? '',
    disposition: filter.disposition ?? '',
    from: day(filter.callSince),
    to: day(filter.callUntil),
  };
}

/**
 * Renders a line with its matches marked. likho-search wraps each match in <mark>…</mark> and
 * nothing else, so the text is split on those tags instead of being handed to the browser as HTML.
 */
export function Marked({ text, lang }: { text: string; lang?: string }) {
  const parts: ReactNode[] = [];
  const pattern = /<mark>(.*?)<\/mark>/gs;
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    parts.push(
      <mark key={match.index} className="rounded-sm bg-accent/20 px-0.5 text-ink">
        {match[1]}
      </mark>,
    );
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <span lang={lang}>{parts}</span>;
}

/** Every transcript line of the workspace, found by a few words in either layer, narrowed by the facts of the call. */
export function SearchPage() {
  const [params, setParams] = useSearchParams();
  const query = params.get('q') ?? '';
  const page = Math.max(1, Number(params.get('page') ?? 1) || 1);
  const narrowing: Narrowing = {
    lang: params.get('lang') ?? '',
    campaign: params.get('campaign') ?? '',
    agent: params.get('agent') ?? '',
    disposition: params.get('disposition') ?? '',
    from: params.get('from') ?? '',
    to: params.get('to') ?? '',
  };
  const filter = toFilter(narrowing);
  const result = useSearch(query, filter, page, PAGE_SIZE);
  const me = useMe();
  const canChange = me.data ? me.data.role !== 'viewer' : false;
  const data = result.data;
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  const go = (next: Partial<Narrowing> & { q?: string; page?: number }) => {
    const values = { ...narrowing, ...next, q: next.q ?? query, page: next.page ?? 1 };
    const fresh = new URLSearchParams();
    if (values.q.trim()) fresh.set('q', values.q.trim());
    for (const key of ['lang', 'campaign', 'agent', 'disposition', 'from', 'to'] as const) {
      if (values[key]) fresh.set(key, values[key]);
    }
    if (values.page > 1) fresh.set('page', String(values.page));
    // The same words again: ask again (a line corrected a moment ago may have reached the index since).
    if (fresh.toString() === params.toString()) void result.refetch();
    else setParams(fresh);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Search</h1>
        <p className="mt-2 max-w-2xl text-ink-2">
          Every line of every call. Type a few words in Hinglish or Devanagari; spellings close to yours count
          too. Narrow it to a campaign, an agent, a disposition or the days the calls were made.
        </p>
      </div>

      {/* Keyed by the query in the address, so a back/forward step shows the words it belongs to. */}
      <SearchForm
        key={query}
        initial={query}
        narrowing={narrowing}
        onSearch={(q) => go({ q, page: 1 })}
        onNarrow={(next) => go({ ...next, page: 1 })}
      />

      <SavedSearches
        current={{ query, narrowing }}
        canChange={canChange}
        onOpen={(saved) => go({ q: saved.query, ...fromSaved(saved.filter), page: 1 })}
      />

      {!query && <p className="text-ink-2">Start with a word or two.</p>}
      {query && result.isLoading && <p className="text-ink-2">Searching…</p>}
      {query && result.error && (
        <p role="alert" className="text-danger">
          {result.error.message}
        </p>
      )}
      {data && (
        <section aria-label="Results" className="space-y-3">
          <p className="text-sm text-ink-2" aria-live="polite">
            {data.total === 0
              ? `Nothing for “${query}”.`
              : `${data.total} line${data.total === 1 ? '' : 's'} for “${query}”, ${data.processingMs} ms.`}
          </p>
          <ol className="divide-y divide-line rounded-card border border-line bg-surface shadow-card">
            {data.hits.map((hit) => (
              <li
                key={`${hit.transcriptId}-${hit.segmentIndex}`}
                className="flex flex-col gap-2 p-4 sm:flex-row sm:items-start sm:gap-4"
              >
                <Link
                  to={`/recordings/${hit.recording.id}?t=${Math.max(0, Math.round(hit.startSeconds * 100) / 100)}`}
                  className="shrink-0 font-mono text-sm text-accent hover:underline"
                  aria-label={`Open ${hit.recording.originalName} at ${clock(hit.startSeconds)}`}
                >
                  {clock(hit.startSeconds)}
                </Link>
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-ink">
                    <Marked text={hit.highlightRoman || hit.textRoman} />
                  </p>
                  {hit.textScript && (
                    <p className="text-sm text-ink-2">
                      <Marked text={hit.highlightScript || hit.textScript} lang="hi" />
                    </p>
                  )}
                  <p className="flex flex-wrap items-center gap-2 text-xs text-ink-3">
                    <Link to={`/recordings/${hit.recording.id}`} className="hover:underline">
                      {hit.recording.originalName}
                    </Link>
                    {hit.recording.externalId && <Tag>{hit.recording.externalId}</Tag>}
                    {hit.recording.attributes
                      .filter((attribute) => ['campaign', 'agent', 'disposition'].includes(attribute.key))
                      .map((attribute) => (
                        <Tag key={attribute.key}>
                          {attribute.key}: {attribute.value}
                        </Tag>
                      ))}
                    <span>{new Date(hit.recording.callTime).toLocaleDateString()}</span>
                  </p>
                </div>
              </li>
            ))}
          </ol>
          {pages > 1 && (
            <nav aria-label="Pages" className="flex items-center justify-between">
              <Button variant="secondary" disabled={page <= 1} onClick={() => go({ page: page - 1 })}>
                <ChevronLeft aria-hidden="true" />
                Previous
              </Button>
              <span className="text-sm text-ink-2">
                Page {page} of {pages}
              </span>
              <Button variant="secondary" disabled={page >= pages} onClick={() => go({ page: page + 1 })}>
                Next
                <ChevronRight aria-hidden="true" />
              </Button>
            </nav>
          )}
        </section>
      )}
    </div>
  );
}

/** A select over the values a fact takes, with counts; "Any" when nothing is chosen. */
function FactSelect({
  label,
  value,
  values,
  onChange,
}: {
  label: string;
  value: string;
  values: FacetValue[] | undefined;
  onChange: (value: string) => void;
}) {
  const known = values ?? [];
  // A value from the address that the counts do not list (narrowed away) is still shown.
  const options = value && !known.some((v) => v.value === value) ? [{ value, count: 0 }, ...known] : known;
  return (
    <label className="flex items-center gap-2 text-sm text-ink-2">
      <span className="sr-only">{label}</span>
      <select
        className={input}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={label}
      >
        <option value="">Any {label.toLowerCase()}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.value}
            {option.count ? ` (${option.count})` : ''}
          </option>
        ))}
      </select>
    </label>
  );
}

function SearchForm({
  initial,
  narrowing,
  onSearch,
  onNarrow,
}: {
  initial: string;
  narrowing: Narrowing;
  onSearch: (query: string) => void;
  onNarrow: (next: Partial<Narrowing>) => void;
}) {
  const [draft, setDraft] = useState(initial);
  const campaigns = useRecordingFacets('campaign');
  const agents = useRecordingFacets(
    'agent',
    narrowing.campaign ? { campaign: narrowing.campaign } : undefined,
  );
  const dispositions = useRecordingFacets(
    'disposition',
    narrowing.campaign ? { campaign: narrowing.campaign } : undefined,
  );
  const narrowed = Object.values(narrowing).some(Boolean);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSearch(draft);
  };
  return (
    <form
      onSubmit={submit}
      aria-label="Search transcripts"
      className="space-y-3 rounded-card border border-line bg-surface p-4 shadow-card"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="flex flex-1 items-center gap-2">
          <SearchIcon aria-hidden="true" className="size-5 shrink-0 text-ink-3" />
          <span className="sr-only">Words to find</span>
          <input
            className={`${input} w-full`}
            type="search"
            placeholder="order confirm, delivery, namaskar…"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            autoFocus
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-ink-2">
          <span className="sr-only">Language</span>
          <select
            className={input}
            value={narrowing.lang}
            onChange={(event) => onNarrow({ lang: event.target.value })}
          >
            {LANGUAGES.map((option) => (
              <option key={option.code} value={option.code}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit" variant="primary" disabled={!draft.trim()}>
          Search
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Narrow the search">
        <FactSelect
          label="Campaign"
          value={narrowing.campaign}
          values={campaigns.data}
          onChange={(campaign) => onNarrow({ campaign, agent: '', disposition: '' })}
        />
        <FactSelect
          label="Agent"
          value={narrowing.agent}
          values={agents.data}
          onChange={(agent) => onNarrow({ agent })}
        />
        <FactSelect
          label="Disposition"
          value={narrowing.disposition}
          values={dispositions.data}
          onChange={(disposition) => onNarrow({ disposition })}
        />
        <label className="flex items-center gap-2 text-sm text-ink-2">
          From
          <input
            type="date"
            aria-label="Calls from"
            className={input}
            value={narrowing.from}
            max={narrowing.to || undefined}
            onChange={(event) => onNarrow({ from: event.target.value })}
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-ink-2">
          To
          <input
            type="date"
            aria-label="Calls up to"
            className={input}
            value={narrowing.to}
            min={narrowing.from || undefined}
            onChange={(event) => onNarrow({ to: event.target.value })}
          />
        </label>
        {narrowed && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onNarrow(EMPTY)}>
            <X aria-hidden="true" className="size-4" />
            Clear
          </Button>
        )}
      </div>
    </form>
  );
}

/** The searches kept for later, and a way to keep the current one. */
function SavedSearches({
  current,
  canChange,
  onOpen,
}: {
  current: { query: string; narrowing: Narrowing };
  canChange: boolean;
  onOpen: (saved: SavedSearch) => void;
}) {
  const saved = useSavedSearches();
  const save = useSaveSearch();
  const remove = useDeleteSavedSearch();
  const me = useMe();
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState('');
  const list = saved.data ?? [];
  if (list.length === 0 && !(canChange && current.query)) return null;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    save.mutate(
      { name: name.trim(), query: current.query, filter: toFilter(current.narrowing) },
      {
        onSuccess: () => {
          setName('');
          setNaming(false);
        },
      },
    );
  };

  return (
    <section aria-label="Saved searches" className="flex flex-wrap items-center gap-2">
      {list.map((entry) => (
        <span key={entry.id} className="inline-flex items-center gap-1">
          <Button variant="secondary" size="sm" onClick={() => onOpen(entry)} title={describe(entry)}>
            <Bookmark aria-hidden="true" className="size-4" />
            {entry.name}
          </Button>
          {canChange && (me.data?.role === 'admin' || entry.createdBy === me.data?.id) && (
            <button
              type="button"
              aria-label={`Remove saved search ${entry.name}`}
              className="rounded-full p-1 text-ink-3 hover:bg-surface-2"
              onClick={() => remove.mutate({ id: entry.id })}
            >
              <X aria-hidden="true" className="size-3.5" />
            </button>
          )}
        </span>
      ))}
      {canChange && current.query && !naming && (
        <Button variant="ghost" size="sm" onClick={() => setNaming(true)}>
          Save this search
        </Button>
      )}
      {naming && (
        <form onSubmit={submit} className="flex items-center gap-2" aria-label="Name the search">
          <input
            aria-label="Name"
            className={`${input} min-h-9`}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="refunds, sales, last week"
            autoFocus
          />
          <Button type="submit" variant="primary" size="sm" disabled={save.isPending || !name.trim()}>
            Save
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setNaming(false)}>
            Cancel
          </Button>
        </form>
      )}
      {save.error && (
        <p role="alert" className="text-sm text-danger">
          {save.error.message}
        </p>
      )}
    </section>
  );
}

/** "refund · campaign sale · agent agent-x · from 2026-09-28" for a tooltip. */
function describe(entry: SavedSearch): string {
  const n = fromSaved(entry.filter);
  const parts = [`“${entry.query}”`];
  if (n.lang) parts.push(`language ${n.lang}`);
  if (n.campaign) parts.push(`campaign ${n.campaign}`);
  if (n.agent) parts.push(`agent ${n.agent}`);
  if (n.disposition) parts.push(`disposition ${n.disposition}`);
  if (n.from) parts.push(`from ${n.from}`);
  if (n.to) parts.push(`to ${n.to}`);
  return parts.join(' · ');
}
