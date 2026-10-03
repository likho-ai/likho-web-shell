import { Button, Tag } from '@likho-ai/ui';
import {
  useDeleteGlossaryTerm,
  useDeleteSpelling,
  useGlossary,
  useSpellings,
  useUpsertGlossaryTerm,
  useUpsertSpelling,
} from '@likho-ai/web-sdk';
import { X } from 'lucide-react';
import { useState, type FormEvent } from 'react';

const input =
  'min-h-11 rounded-input border border-line-strong bg-surface px-3 text-ink focus-visible:outline-accent';

export function VocabularyPage() {
  const glossary = useGlossary();
  const spellings = useSpellings();
  const addTerm = useUpsertGlossaryTerm();
  const removeTerm = useDeleteGlossaryTerm();
  const addSpelling = useUpsertSpelling();
  const removeSpelling = useDeleteSpelling();
  const [term, setTerm] = useState('');
  const [source, setSource] = useState('');
  const [target, setTarget] = useState('');

  const submitTerm = (event: FormEvent) => {
    event.preventDefault();
    if (!term.trim()) return;
    addTerm.mutate({ term: term.trim() }, { onSuccess: () => setTerm('') });
  };
  const submitSpelling = (event: FormEvent) => {
    event.preventDefault();
    if (!source.trim() || !target.trim()) return;
    addSpelling.mutate(
      { source: source.trim(), target: target.trim() },
      {
        onSuccess: () => {
          setSource('');
          setTarget('');
        },
      },
    );
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Vocabulary</h1>
        <p className="mt-2 max-w-2xl text-ink-2">
          Names the model listens for, and how words are written in Hinglish. A new spelling rewrites the
          Hinglish of a transcript from its saved Devanagari without running the model again (Transcript →
          Re-apply spellings).
        </p>
      </div>

      <section
        className="rounded-card border border-line bg-surface p-6 shadow-card"
        aria-labelledby="glossary"
      >
        <h2 id="glossary" className="text-xl font-bold">
          Glossary
        </h2>
        <p className="mt-1 text-sm text-ink-2">Product and person names, in Devanagari, one per entry.</p>
        <form onSubmit={submitTerm} className="mt-4 flex flex-wrap gap-2">
          <input
            aria-label="New glossary name"
            lang="hi"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="त्रिफला"
            className={`${input} flex-1`}
          />
          <Button type="submit" variant="primary" disabled={addTerm.isPending}>
            Add
          </Button>
        </form>
        {addTerm.error && (
          <p role="alert" className="mt-2 text-sm text-[var(--likho-status-failed-ink)]">
            {addTerm.error.message}
          </p>
        )}
        <ul className="mt-4 flex flex-wrap gap-2" aria-label="Glossary names">
          {(glossary.data ?? []).map((entry) => (
            <li key={entry.id}>
              <Tag className="gap-1 pr-1">
                <span lang="hi">{entry.term}</span>
                <button
                  type="button"
                  aria-label={`Remove ${entry.term}`}
                  className="rounded-full p-1 hover:bg-surface-2"
                  onClick={() => removeTerm.mutate({ id: entry.id })}
                >
                  <X aria-hidden="true" className="size-3.5" />
                </button>
              </Tag>
            </li>
          ))}
          {glossary.isSuccess && glossary.data.length === 0 && (
            <li className="text-sm text-ink-3">No names yet.</li>
          )}
        </ul>
      </section>

      <section
        className="rounded-card border border-line bg-surface p-6 shadow-card"
        aria-labelledby="spellings"
      >
        <h2 id="spellings" className="text-xl font-bold">
          Spellings
        </h2>
        <p className="mt-1 text-sm text-ink-2">
          Heard as (Devanagari) → written as (Hinglish). Several words make a phrase.
        </p>
        <form onSubmit={submitSpelling} className="mt-4 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <input
            aria-label="Heard as"
            lang="hi"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="त्रिफला"
            className={input}
          />
          <input
            aria-label="Written as"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="Triphala"
            className={input}
          />
          <Button type="submit" variant="primary" disabled={addSpelling.isPending}>
            Add
          </Button>
        </form>
        {addSpelling.error && (
          <p role="alert" className="mt-2 text-sm text-[var(--likho-status-failed-ink)]">
            {addSpelling.error.message}
          </p>
        )}
        <table className="mt-4 w-full text-left text-sm">
          <thead className="text-ink-3">
            <tr>
              <th className="py-2 pr-4 font-medium">Heard as</th>
              <th className="py-2 pr-4 font-medium">Written as</th>
              <th className="py-2 pr-4 font-medium">Kind</th>
              <th className="py-2 font-medium">
                <span className="sr-only">Remove</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {(spellings.data ?? []).map((entry) => (
              <tr key={entry.id} className="border-t border-line">
                <td className="py-2 pr-4" lang="hi">
                  {entry.source}
                </td>
                <td className="py-2 pr-4 font-medium">{entry.target}</td>
                <td className="py-2 pr-4 text-ink-2">{entry.isPhrase ? 'phrase' : 'word'}</td>
                <td className="py-2 text-right">
                  <Button variant="ghost" size="sm" onClick={() => removeSpelling.mutate({ id: entry.id })}>
                    Remove
                  </Button>
                </td>
              </tr>
            ))}
            {spellings.isSuccess && spellings.data.length === 0 && (
              <tr>
                <td colSpan={4} className="py-3 text-ink-3">
                  No spellings yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
