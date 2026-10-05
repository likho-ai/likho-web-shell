import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router';
import { Marked, SearchPage } from '../src/pages/Search';
import { fakeApi, person, renderAt } from './helpers';

const hit = (index: number, roman: string, script: string, highlightRoman: string) => ({
  recording: {
    id: 'rec_1',
    originalName: 'call.mp3',
    mediaId: 'med_1',
    sizeBytes: 1,
    sha256: '',
    durationSeconds: 60,
    channels: 1,
    sampleRate: 8000,
    source: 'ameyo',
    externalId: 'd000-0a1b2c3d-vce-0001',
    attributes: [{ key: 'campaign', value: 'inbound' }],
    status: 'done',
    failureReason: '',
    latestTranscriptId: 'trn_1',
    detectedLanguage: 'hi',
    languageProbability: 0.9,
    callTime: '2026-10-01T09:00:00.000Z',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  transcriptId: 'trn_1',
  segmentIndex: index,
  startSeconds: 65 + index,
  endSeconds: 68 + index,
  textRoman: roman,
  textScript: script,
  highlightRoman,
  highlightScript: script,
  language: 'hi',
});

describe('the search page', () => {
  it('marks the matches without handing text to the browser as HTML', () => {
    render(<Marked text="a <mark>b</mark> <b>c</b> <mark>d</mark>" />);
    expect(screen.getAllByText((_, el) => el?.tagName === 'MARK').map((el) => el.textContent)).toEqual([
      'b',
      'd',
    ]);
    expect(screen.getByText(/<b>c<\/b>/)).toBeInTheDocument(); // stays text, not an element
  });

  it('searches what is in the address, pages, and links each line to its moment', async () => {
    const asked: Record<string, unknown>[] = [];
    const { client } = fakeApi({
      Me: () => ({ me: person }),
      RecordingFacets: () => ({ recordingFacets: [] }),
      SavedSearches: () => ({ savedSearches: [] }),
      Search: (v) => {
        asked.push(v);
        const page = Number(v.page);
        return {
          search: {
            total: 25,
            page,
            pageSize: 20,
            processingMs: 4,
            hits:
              page === 1
                ? [hit(0, 'order confirm hai', 'ऑर्डर कन्फर्म है', '<mark>order</mark> confirm hai')]
                : [hit(1, 'order kal aayega', 'ऑर्डर कल आएगा', '<mark>order</mark> kal aayega')],
          },
        };
      },
    });
    renderAt(
      '/search?q=order&lang=hi',
      <Routes>
        <Route path="/search" element={<SearchPage />} />
      </Routes>,
      client,
    );
    const results = await screen.findByRole('region', { name: 'Results' });
    expect(within(results).getByText(/25 lines for “order”/)).toBeInTheDocument();
    expect(asked[0]).toMatchObject({ query: 'order', filter: { language: 'hi' }, page: 1, pageSize: 20 });
    const open = within(results).getByRole('link', { name: 'Open call.mp3 at 01:05' });
    expect(open).toHaveAttribute('href', '/recordings/rec_1?t=65');
    expect(within(results).getByText('campaign: inbound')).toBeInTheDocument();
    expect(within(results).getAllByText((_, el) => el?.tagName === 'MARK')[0]).toHaveTextContent('order');

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await waitFor(() => expect(asked.at(-1)).toMatchObject({ page: 2 }));
    expect(await within(results).findByText(/kal aayega/)).toBeInTheDocument();

    // New words: back to the first page.
    const box = screen.getByRole('searchbox', { name: 'Words to find' });
    await user.clear(box);
    await user.type(box, 'delivery{Enter}');
    await waitFor(() => expect(asked.at(-1)).toMatchObject({ query: 'delivery', page: 1 }));

    // The same words again ask again: the index may have changed since.
    const before = asked.length;
    await user.click(screen.getByRole('button', { name: 'Search' }));
    await waitFor(() => expect(asked.length).toBe(before + 1));
  });

  it('narrows by campaign, agent and the days of the calls, and keeps a search for later', async () => {
    const asked: Record<string, unknown>[] = [];
    const saved: Record<string, unknown>[] = [];
    const { client, calls } = fakeApi({
      Me: () => ({ me: person }),
      RecordingFacets: (v) =>
        v.key === 'campaign'
          ? {
              recordingFacets: [
                { value: 'sale', count: 12 },
                { value: 'support', count: 3 },
              ],
            }
          : { recordingFacets: [{ value: 'agent-x', count: 7 }] },
      SavedSearches: () => ({ savedSearches: saved }),
      SaveSearch: (v) => {
        const input = v.input as { name: string; query: string; filter: Record<string, string> };
        const entry = {
          id: 'sav_1',
          name: input.name,
          query: input.query,
          filter: {
            language: null,
            recordingId: null,
            campaign: input.filter.campaign ?? null,
            agent: input.filter.agent ?? null,
            disposition: null,
            source: null,
            since: null,
            until: null,
            callSince: input.filter.callSince ?? null,
            callUntil: null,
          },
          createdBy: person.id,
          createdAt: new Date().toISOString(),
        };
        saved.push(entry);
        return { saveSearch: entry };
      },
      DeleteSavedSearch: () => {
        saved.length = 0;
        return { deleteSavedSearch: true };
      },
      Search: (v) => {
        asked.push(v);
        return { search: { total: 0, page: 1, pageSize: 20, processingMs: 1, hits: [] } };
      },
    });
    renderAt(
      '/search?q=refund',
      <Routes>
        <Route path="/search" element={<SearchPage />} />
      </Routes>,
      client,
    );
    await screen.findByRole('region', { name: 'Results' });
    const user = userEvent.setup();
    const campaign = await screen.findByRole('combobox', { name: 'Campaign' });
    await waitFor(() =>
      expect(within(campaign).getByRole('option', { name: 'sale (12)' })).toBeInTheDocument(),
    );
    await user.selectOptions(campaign, 'sale');
    await user.selectOptions(await screen.findByRole('combobox', { name: 'Agent' }), 'agent-x');
    await user.type(screen.getByLabelText('Calls from'), '2026-09-28');
    await waitFor(() =>
      expect(asked.at(-1)).toMatchObject({
        query: 'refund',
        filter: {
          campaign: 'sale',
          agent: 'agent-x',
          callSince: new Date('2026-09-28T00:00:00').toISOString(),
        },
        page: 1,
      }),
    );
    // The agent list is narrowed to the campaign.
    expect(
      calls.filter((c) => c.name === 'RecordingFacets' && c.variables.key === 'agent').at(-1)?.variables,
    ).toMatchObject({
      key: 'agent',
      filter: { campaign: 'sale' },
    });

    // Kept for later under a name, listed, opened, removed.
    await user.click(screen.getByRole('button', { name: 'Save this search' }));
    await user.type(screen.getByLabelText('Name'), 'refunds in sales');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(calls.find((c) => c.name === 'SaveSearch')?.variables).toMatchObject({
        input: { name: 'refunds in sales', query: 'refund', filter: { campaign: 'sale', agent: 'agent-x' } },
      }),
    );
    const kept = await screen.findByRole('button', { name: 'refunds in sales' });
    await user.click(screen.getByRole('button', { name: 'Clear' }));
    await waitFor(() => expect(asked.at(-1)).toMatchObject({ filter: {} }));
    await user.click(kept);
    await waitFor(() =>
      expect(asked.at(-1)).toMatchObject({ filter: { campaign: 'sale', agent: 'agent-x' } }),
    );
    await user.click(screen.getByRole('button', { name: 'Remove saved search refunds in sales' }));
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'refunds in sales' })).not.toBeInTheDocument(),
    );
  });
});
