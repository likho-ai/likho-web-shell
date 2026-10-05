/** Yesterday's numbers on the home page, for whoever is signed in: no query to type. */
import { useAnalyticsOverview, yesterday } from '@likho-ai/web-sdk';
import { useMemo } from 'react';
import { Link } from 'react-router';

const one = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1));

export function Yesterday() {
  const window = useMemo(() => yesterday(), []);
  const overview = useAnalyticsOverview(window);
  const o = overview.data;
  const day = new Date(window.since).toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const items = [
    { label: 'Calls', value: o ? String(o.calls) : '–' },
    { label: 'Transcribed', value: o ? String(o.transcribed) : '–' },
    { label: 'Minutes', value: o ? one(o.minutes) : '–' },
    { label: 'Analysed', value: o ? String(o.analysed) : '–' },
    { label: 'Average score', value: o && o.analysed > 0 ? `${Math.round(100 * o.score)}%` : '–' },
  ];
  return (
    <section
      aria-labelledby="yesterday-title"
      className="rounded-card border border-line bg-surface p-6 shadow-card"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="yesterday-title" className="text-xl font-bold">
          Yesterday, {day}
        </h2>
        <Link to="/insights" className="text-sm font-medium hover:underline">
          The last two weeks →
        </Link>
      </div>
      {overview.isError ? (
        <p role="alert" className="mt-3 text-sm text-[var(--likho-status-failed-ink)]">
          {overview.error.message}
        </p>
      ) : (
        <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-5" aria-label="Yesterday in numbers">
          {items.map((item) => (
            <div key={item.label}>
              <dt className="text-sm text-ink-2">{item.label}</dt>
              <dd className="mt-1 text-2xl font-bold" aria-busy={overview.isPending}>
                {item.value}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}
