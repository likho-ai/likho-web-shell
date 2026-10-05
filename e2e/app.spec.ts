/**
 * A person signs in, uploads a call, watches it being transcribed and reads the transcript.
 * Needs: LIKHO_E2E_EMAIL, LIKHO_E2E_PASSWORD (an account of the running likho-api) and
 * LIKHO_E2E_FILE (a recording on this machine; it is deleted from Likho at the end).
 */
import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';

const email = process.env.LIKHO_E2E_EMAIL ?? 'admin@example.com';
const password = process.env.LIKHO_E2E_PASSWORD ?? 'admin-password-1';
const file = process.env.LIKHO_E2E_FILE;
const shots = process.env.LIKHO_E2E_SHOTS ?? '';

test('upload a call and read its transcript', async ({ page }) => {
  test.skip(!file, 'LIKHO_E2E_FILE is not set');

  // What the browser logs is the first clue when a step fails.
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning')
      console.log(`[browser ${message.type()}] ${message.text()}`);
  });
  page.on('pageerror', (error) => console.log(`[browser pageerror] ${error.message}`));

  await page.goto('/');
  // The first load after a dev-server start bundles dependencies and reloads once.
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Every call.', { timeout: 60_000 });
  if (shots) await page.screenshot({ path: `${shots}/home-light.png`, fullPage: true });

  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('form', { name: 'Sign in' }).getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { name: 'Recordings' })).toBeVisible();

  await page.getByRole('main').getByRole('button', { name: 'Upload call' }).click();
  await page.getByLabel('Choose files').setInputFiles(file!);
  const queue = page.getByLabel('Upload queue');
  await expect(queue.getByText('Uploaded — open')).toBeVisible({ timeout: 60_000 });
  if (shots) await page.screenshot({ path: `${shots}/recordings-uploaded.png`, fullPage: true });

  // The row appears with a live status, and ends as Done without a reload.
  const row = page
    .getByRole('row')
    .filter({ hasText: basename(file!) })
    .first();
  await expect(row).toBeVisible();
  await expect(row.getByText('Done')).toBeVisible({ timeout: 240_000 });

  await row.getByRole('link', { name: 'Open' }).click();
  await expect(page.getByRole('heading', { name: 'Transcript' })).toBeVisible();
  const lines = page.getByLabel('Transcript lines').getByRole('listitem');
  await expect(lines.first()).toBeVisible({ timeout: 30_000 });
  const count = await lines.count();
  expect(count).toBeGreaterThan(0);

  await page.getByRole('radio', { name: 'Both' }).click();
  await expect(lines.first().locator('p[lang="hi"]')).toBeVisible();
  if (shots) await page.screenshot({ path: `${shots}/transcript-light.png`, fullPage: true });
  await page.getByRole('button', { name: 'Switch to dark mode' }).click();
  await page.waitForTimeout(400); // colour transitions
  if (shots) await page.screenshot({ path: `${shots}/transcript-dark.png`, fullPage: true });
  await page.getByRole('button', { name: 'Switch to light mode' }).click();

  // The player loaded the waveform and the first timestamp seeks.
  await expect(page.getByTestId('waveform').locator('canvas').first()).toBeVisible({ timeout: 30_000 });
  await lines
    .first()
    .getByRole('button', { name: /^Play from/ })
    .click();
  await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible({ timeout: 15_000 });
  await page.getByRole('button', { name: 'Pause' }).click();

  // A correction: the Hinglish of the first line gets a word of its own; the new version shows it.
  const marker = `zxq${Date.now().toString(36)}`;
  await lines
    .first()
    .getByRole('button', { name: /^Correct the Hinglish/ })
    .click();
  const box = page.getByRole('textbox', { name: /^Correct the Hinglish/ });
  await box.press('End');
  await box.type(` ${marker}`);
  await box.press('Enter');
  await expect(lines.first().getByText('corrected')).toBeVisible({ timeout: 30_000 });
  await expect(lines.first()).toContainText(marker);

  // Search finds a word of the transcript - the corrected one - and opens the line at its moment.
  const firstLine = marker;
  const word = firstLine;
  const recordingUrl = page.url().split('?')[0]!;
  await page.getByRole('link', { name: 'Search' }).click();
  await page.getByRole('searchbox', { name: 'Words to find' }).fill(word);
  await page.getByRole('button', { name: 'Search' }).click();
  const results = page.getByRole('region', { name: 'Results' });
  await expect(results).toBeVisible({ timeout: 30_000 });
  const openAt = results.getByRole('link', { name: /^Open .* at / }).first();
  // The corrected version reaches the index a moment after the correction: ask again until it is there.
  await expect(async () => {
    if (!(await openAt.isVisible())) await page.getByRole('button', { name: 'Search' }).click();
    await expect(openAt).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 30_000 });
  const recordingId = recordingUrl.split('/').pop()!;
  await expect(openAt).toHaveAttribute('href', new RegExp(`/recordings/${recordingId}\\?t=[\\d.]+$`));
  await openAt.click();
  await expect(page.getByRole('heading', { name: 'Transcript' })).toBeVisible();
  await expect(page.getByLabel('Transcript lines').locator('[aria-current="true"]')).toBeVisible({
    timeout: 30_000,
  });

  // Clean up: the recording and its audio.
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Delete this recording' }).click();
  await expect(page.getByRole('heading', { name: 'Recordings' })).toBeVisible();
  await expect(page.locator(`a[href="/recordings/${recordingId}"]`)).toHaveCount(0);
});

/**
 * An admin invites a viewer, who joins through the link and can only read; the admin changes
 * the role and disables the person, and every step is in the audit log. Needs likho-api, the
 * shell and the library and admin apps (no transcription).
 */
test('invite a viewer, change their role, and read the audit log', async ({ page, browser }) => {
  page.on('pageerror', (error) => console.log(`[browser pageerror] ${error.message}`));
  const stamp = Date.now().toString(36);
  const viewerEmail = `viewer-${stamp}@example.test`;

  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('form', { name: 'Sign in' }).getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { name: 'Recordings' })).toBeVisible();

  // The admin app: people, and an invitation whose link comes back to the admin.
  await page.getByRole('link', { name: 'Admin' }).click();
  await expect(page.getByRole('heading', { name: 'People' })).toBeVisible({ timeout: 60_000 });
  await expect(page.getByRole('row').filter({ hasText: email })).toContainText('(you)');
  const invite = page.getByRole('form', { name: 'Invite' });
  await invite.getByLabel('Email').fill(viewerEmail);
  await invite.getByLabel('Role').selectOption('viewer');
  await invite.getByRole('button', { name: 'Invite' }).click();
  const status = page.getByRole('status').filter({ hasText: viewerEmail });
  await expect(status).toBeVisible();
  const link = (await status.locator('code').textContent())!.trim();
  expect(link).toMatch(/\/invite\/[A-Za-z0-9_-]{40,}$/);
  await expect(page.getByRole('list', { name: 'Invitations sent' })).toContainText(viewerEmail);
  if (shots) await page.screenshot({ path: `${shots}/admin-invited.png`, fullPage: true });

  // The invited person, in a browser of their own: the link, a name, a password - signed in as a viewer.
  const theirs = await browser.newContext();
  const their = await theirs.newPage();
  await their.goto(link);
  await expect(their.getByRole('heading', { name: /^Join / })).toBeVisible({ timeout: 60_000 });
  await expect(their.getByText(/invited as a viewer/)).toBeVisible();
  await their.getByLabel('Your name').fill('Vee Viewer');
  await their.getByLabel('Choose a password').fill(`viewer-${stamp}-pw`);
  await their.getByRole('button', { name: 'Join and sign in' }).click();
  await expect(their.getByRole('heading', { name: 'Recordings' })).toBeVisible();
  await expect(their.getByRole('link', { name: 'Search' })).toBeVisible();
  await expect(their.getByRole('button', { name: 'Upload call' })).toHaveCount(0);
  await expect(their.getByRole('link', { name: 'Admin' })).toHaveCount(0);
  await expect(their.getByRole('button', { name: 'Transcribe' })).toHaveCount(0);
  if (shots) await their.screenshot({ path: `${shots}/viewer-recordings.png`, fullPage: true });
  // The link is used up.
  await their.goto(link);
  await expect(their.getByRole('alert')).toContainText('This link does not work any more.');

  // Back with the admin: the person is listed; a role change; then disabled - and signed out at once.
  await page.reload();
  const row = page.getByRole('row').filter({ hasText: viewerEmail });
  await expect(row).toBeVisible({ timeout: 60_000 });
  await row.getByLabel('Role of Vee Viewer').selectOption('member');
  await expect(row.getByLabel('Role of Vee Viewer')).toHaveValue('member');
  await their.goto('/recordings');
  await expect(their.getByRole('button', { name: 'Upload call' })).toBeVisible({ timeout: 30_000 });

  page.once('dialog', (dialog) => dialog.accept());
  await row.getByRole('button', { name: 'Disable' }).click();
  await expect(row.getByRole('button', { name: 'Enable' })).toBeVisible();
  await their.goto('/recordings');
  await expect(their.getByRole('heading', { name: 'Sign in' })).toBeVisible({ timeout: 30_000 });
  await theirs.close();

  // The audit log has every step, newest first.
  const changes = page.getByRole('list', { name: 'Changes' });
  await expect(changes).toBeVisible();
  await page.getByRole('button', { name: 'People', exact: true }).click();
  await expect(changes.getByRole('listitem').first()).toContainText(/user disabled/);
  await expect(changes).toContainText(/user role changed/);
  await expect(changes).toContainText(/user invited/);
  await expect(changes).toContainText(viewerEmail);
  if (shots) await page.screenshot({ path: `${shots}/admin-audit.png`, fullPage: true });
});

/**
 * A name added to the vocabulary is heard in the next transcription, and its count rises. Needs
 * the four services, likho-api, the shell and the library, transcript and vocabulary apps, and
 * LIKHO_E2E_FILE: a recording in which LIKHO_E2E_TERM (default अश्वगंधा) is spoken.
 */
test('a name added to the vocabulary is heard in the next transcription', async ({ page }) => {
  test.skip(!file, 'LIKHO_E2E_FILE is not set');
  const term = process.env.LIKHO_E2E_TERM ?? 'अश्वगंधा';
  page.on('pageerror', (error) => console.log(`[browser pageerror] ${error.message}`));

  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('form', { name: 'Sign in' }).getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { name: 'Recordings' })).toBeVisible();

  // The vocabulary app: the name goes in (or stays, from an earlier run), with its count so far.
  await page.getByRole('link', { name: 'Vocabulary' }).click();
  await expect(page.getByRole('heading', { name: 'Glossary' })).toBeVisible({ timeout: 60_000 });
  const glossary = () => page.getByRole('heading', { name: 'Glossary' }).locator('xpath=ancestor::section');
  await glossary().getByLabel('New glossary name').fill(term);
  await glossary().getByLabel('Note').fill('e2e');
  await glossary().getByRole('button', { name: 'Add' }).click();
  const heard = () => glossary().getByLabel(new RegExp(`^${term} heard \\d+ times$`));
  await expect(heard()).toBeVisible();
  const before = Number((await heard().textContent())!.trim());
  if (shots) await page.screenshot({ path: `${shots}/vocabulary-before.png` });

  // A call in which the name is spoken; the worker listens for it as a hotword.
  await page.getByRole('link', { name: 'Recordings' }).click();
  await page.getByRole('main').getByRole('button', { name: 'Upload call' }).click();
  await page.getByLabel('Choose files').setInputFiles(file!);
  await expect(page.getByLabel('Upload queue').getByText('Uploaded — open')).toBeVisible({ timeout: 60_000 });
  const row = page
    .getByRole('row')
    .filter({ hasText: basename(file!) })
    .first();
  await expect(row.getByText('Done')).toBeVisible({ timeout: 240_000 });
  const recordingId = (await row.getByRole('link', { name: 'Open' }).getAttribute('href'))!.split('/').pop()!;

  // likho-language counted the lines as the worker published them: the count rose.
  await page.getByRole('link', { name: 'Vocabulary' }).click();
  await expect(async () => {
    await page.reload();
    await expect(heard()).toBeVisible({ timeout: 10_000 });
    expect(Number((await heard().textContent())!.trim())).toBeGreaterThan(before);
  }).toPass({ timeout: 60_000 });
  await expect(glossary().getByRole('row').filter({ hasText: term })).toContainText('just now');
  if (shots) await page.screenshot({ path: `${shots}/vocabulary-heard.png` });

  // Clean up: the recording and the name.
  await page.goto(`/recordings/${recordingId}`);
  await expect(page.getByRole('heading', { name: 'Transcript' })).toBeVisible({ timeout: 60_000 });
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Delete this recording' }).click();
  await expect(page.getByRole('heading', { name: 'Recordings' })).toBeVisible();
  await page.getByRole('link', { name: 'Vocabulary' }).click();
  await glossary()
    .getByRole('button', { name: `Remove ${term}` })
    .click();
  await expect(heard()).toHaveCount(0);
});

/**
 * "Every sale call of agent X last week with the word …" is one search: a call arrives with its
 * facts (as a connector sends them), is transcribed, and the search and the library narrow by
 * campaign, agent and the days; the search is kept for later. Needs the four services, likho-api,
 * the shell and the library and transcript apps, and LIKHO_E2E_FILE (a recording in which
 * LIKHO_E2E_TERM, default अश्वगंधा, is spoken).
 */
test('every sale call of one agent last week with a word is one search', async ({ page }) => {
  test.skip(!file, 'LIKHO_E2E_FILE is not set');
  const word = process.env.LIKHO_E2E_TERM ?? 'अश्वगंधा';
  page.on('pageerror', (error) => console.log(`[browser pageerror] ${error.message}`));
  const stamp = Date.now().toString(36);
  const agent = `agent-${stamp}`;

  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('form', { name: 'Sign in' }).getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { name: 'Recordings' })).toBeVisible();

  // The call comes with its facts, the way a connector sends them: three days ago, a sale by this agent.
  const threeDaysAgo = new Date(Date.now() - 3 * 86_400_000);
  const pad = (n: number) => String(n).padStart(2, '0');
  const callTime = `${threeDaysAgo.getFullYear()}-${pad(threeDaysAgo.getMonth() + 1)}-${pad(threeDaysAgo.getDate())} 10:15:00`;
  const bytes = await readFile(file!);
  const name = `sale-${stamp}.mp3`;
  const ticket = await (
    await page.request.post('/graphql', {
      data: {
        query: `mutation ($input: RequestUploadInput!) { requestUpload(input: $input) { uploadUrl recording { id } } }`,
        variables: {
          input: {
            originalName: name,
            sizeBytes: bytes.byteLength,
            attributes: [
              { key: 'campaign', value: 'sale' },
              { key: 'agent', value: agent },
              { key: 'disposition', value: 'sold' },
              { key: 'callTime', value: callTime },
            ],
          },
        },
      },
    })
  ).json();
  const recordingId: string = ticket.data.requestUpload.recording.id;
  const put = await page.request.put(ticket.data.requestUpload.uploadUrl, {
    data: bytes,
    headers: { 'content-type': 'audio/mpeg' },
  });
  expect(put.ok()).toBeTruthy();

  // The library shows the facts and narrows by them; the call is transcribed meanwhile.
  await page.goto(`/recordings?campaign=sale&agent=${agent}`);
  const row = page.getByRole('row').filter({ hasText: name }).first();
  await expect(row).toBeVisible({ timeout: 60_000 });
  await expect(row).toContainText('sale');
  await expect(row).toContainText(agent);
  await expect(row.getByText('Done')).toBeVisible({ timeout: 240_000 });
  await page.goto(`/recordings?campaign=support`);
  await expect(page.getByRole('row').filter({ hasText: name })).toHaveCount(0);
  if (shots) {
    await page.goto(`/recordings?campaign=sale&agent=${agent}`);
    await expect(page.getByRole('row').filter({ hasText: name }).first()).toBeVisible();
    await page.screenshot({ path: `${shots}/library-narrowed.png` });
  }

  // One search: the word, the campaign, the agent, the last seven days.
  const weekAgo = new Date(Date.now() - 7 * 86_400_000);
  const from = `${weekAgo.getFullYear()}-${pad(weekAgo.getMonth() + 1)}-${pad(weekAgo.getDate())}`;
  await page.goto(`/search?q=${encodeURIComponent(word)}&campaign=sale&agent=${agent}&from=${from}`);
  const results = page.getByRole('region', { name: 'Results' });
  await expect(async () => {
    if (!(await results.getByRole('link', { name: name }).first().isVisible())) {
      await page.getByRole('button', { name: 'Search' }).click();
    }
    await expect(results.getByRole('link', { name: name }).first()).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 60_000 });
  await expect(results.getByText(`campaign: sale`).first()).toBeVisible();
  if (shots) await page.screenshot({ path: `${shots}/search-narrowed.png` });
  // Another campaign: nothing.
  await page.getByRole('combobox', { name: 'Campaign' }).selectOption('support');
  await expect(page.getByText(new RegExp(`Nothing for`))).toBeVisible({ timeout: 30_000 });

  // Kept for later, and opened from its chip.
  await page.getByRole('combobox', { name: 'Campaign' }).selectOption('sale');
  await page.getByRole('combobox', { name: 'Agent' }).selectOption(agent);
  await page.getByRole('button', { name: 'Save this search' }).click();
  await page.getByLabel('Name').fill(`sales of ${agent}`);
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  const chip = page.getByRole('button', { name: `sales of ${agent}` });
  await expect(chip).toBeVisible();
  await page.goto('/search');
  await page.getByRole('button', { name: `sales of ${agent}` }).click();
  await expect(page).toHaveURL(new RegExp(`campaign=sale&agent=${agent}`));
  await expect(results.getByRole('link', { name: name }).first()).toBeVisible({ timeout: 30_000 });

  // Clean up: the saved search and the recording.
  await page.getByRole('button', { name: `Remove saved search sales of ${agent}` }).click();
  await expect(page.getByRole('button', { name: `sales of ${agent}` })).toHaveCount(0);
  await page.goto(`/recordings/${recordingId}`);
  await expect(page.getByRole('heading', { name: 'Transcript' })).toBeVisible({ timeout: 60_000 });
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Delete this recording' }).click();
  await expect(page.getByRole('heading', { name: 'Recordings' })).toBeVisible();
});
