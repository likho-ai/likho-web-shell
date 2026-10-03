import { Button, Tag } from '@likho-ai/ui';
import { clock, useSearch, type SearchFilter } from '@likho-ai/web-sdk';
import { ChevronLeft, ChevronRight, Search as SearchIcon } from 'lucide-react';
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

/** Every transcript line of the workspace, found by a few words in either layer. */
export function SearchPage() {
  const [params, setParams] = useSearchParams();
  const query = params.get('q') ?? '';
  const language = params.get('lang') ?? '';
  const page = Math.max(1, Number(params.get('page') ?? 1) || 1);

  const filter: SearchFilter = language ? { language } : {};
  const result = useSearch(query, filter, page, PAGE_SIZE);
  const data = result.data;
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  const go = (next: { q?: string; lang?: string; page?: number }) => {
    const values = { q: next.q ?? query, lang: next.lang ?? language, page: next.page ?? 1 };
    const fresh = new URLSearchParams();
    if (values.q.trim()) fresh.set('q', values.q.trim());
    if (values.lang) fresh.set('lang', values.lang);
    if (values.page > 1) fresh.set('page', String(values.page));
    setParams(fresh);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Search</h1>
        <p className="mt-2 max-w-2xl text-ink-2">
          Every line of every call. Type a few words in Hinglish or Devanagari; spellings close to yours count
          too.
        </p>
      </div>

      {/* Keyed by the query in the address, so a back/forward step shows the words it belongs to. */}
      <SearchForm
        key={query}
        initial={query}
        language={language}
        onSearch={(q) => go({ q, page: 1 })}
        onLanguage={(lang) => go({ lang, page: 1 })}
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
                  to={`/recordings/${hit.recording.id}?t=${Math.floor(hit.startSeconds)}`}
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
                    {hit.recording.attributes.slice(0, 3).map((attribute) => (
                      <Tag key={attribute.key}>
                        {attribute.key}: {attribute.value}
                      </Tag>
                    ))}
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

function SearchForm({
  initial,
  language,
  onSearch,
  onLanguage,
}: {
  initial: string;
  language: string;
  onSearch: (query: string) => void;
  onLanguage: (language: string) => void;
}) {
  const [draft, setDraft] = useState(initial);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSearch(draft);
  };
  return (
    <form
      onSubmit={submit}
      aria-label="Search transcripts"
      className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4 shadow-card sm:flex-row sm:items-center"
    >
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
        <select className={input} value={language} onChange={(event) => onLanguage(event.target.value)}>
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
    </form>
  );
}
