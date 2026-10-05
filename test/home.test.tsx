import { screen, waitFor } from '@testing-library/react';
import { HomePage } from '../src/pages/Home';
import { fakeApi, person, renderAt } from './helpers';

describe('the home page', () => {
  it('shows yesterday in numbers to whoever is signed in, without a query to type', async () => {
    const { client, calls } = fakeApi({
      Me: () => ({ me: person }),
      AnalyticsOverview: () => ({
        analyticsOverview: {
          calls: 1240,
          transcribed: 1198,
          failed: 3,
          minutes: 2480.5,
          realtimeFactor: 0.8,
          analysed: 640,
          score: 0.79,
          sentiments: [],
          languages: [],
        },
      }),
    });
    renderAt('/', <HomePage />, client);
    const numbers = await screen.findByLabelText('Yesterday in numbers');
    await waitFor(() => expect(numbers).toHaveTextContent('Calls1240'));
    expect(numbers).toHaveTextContent('Transcribed1198');
    expect(numbers).toHaveTextContent('Minutes2480.5');
    expect(numbers).toHaveTextContent('Analysed640');
    expect(numbers).toHaveTextContent('Average score79%');
    expect(screen.getByRole('heading', { name: /^Yesterday, / })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /The last two weeks/ })).toHaveAttribute('href', '/insights');

    // Whole local days: from the start of yesterday to the start of today.
    const asked = calls.find((c) => c.name === 'AnalyticsOverview')!.variables as {
      since: string;
      until: string;
    };
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const yesterday = new Date(start);
    yesterday.setDate(yesterday.getDate() - 1);
    expect(asked).toMatchObject({ since: yesterday.toISOString(), until: start.toISOString() });
  });

  it('shows a visitor the pitch only', async () => {
    const { client, calls } = fakeApi({ Me: () => null });
    renderAt('/', <HomePage />, client);
    expect(await screen.findByRole('link', { name: 'Upload a call' })).toHaveAttribute('href', '/login');
    expect(screen.queryByLabelText('Yesterday in numbers')).not.toBeInTheDocument();
    expect(calls.some((c) => c.name === 'AnalyticsOverview')).toBe(false);
  });
});
