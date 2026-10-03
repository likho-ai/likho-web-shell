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
  });
});
