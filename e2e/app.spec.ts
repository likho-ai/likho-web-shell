/**
 * A person signs in, uploads a call, watches it being transcribed and reads the transcript.
 * Needs: LIKHO_E2E_EMAIL, LIKHO_E2E_PASSWORD (an account of the running likho-api) and
 * LIKHO_E2E_FILE (a recording on this machine; it is deleted from Likho at the end).
 */
import { expect, test } from '@playwright/test';
import { basename } from 'node:path';

const email = process.env.LIKHO_E2E_EMAIL ?? 'admin@example.com';
const password = process.env.LIKHO_E2E_PASSWORD ?? 'admin-password-1';
const file = process.env.LIKHO_E2E_FILE;
const shots = process.env.LIKHO_E2E_SHOTS ?? '';

test('upload a call and read its transcript', async ({ page }) => {
  test.skip(!file, 'LIKHO_E2E_FILE is not set');

  // What the browser logs is the first clue when a step fails.
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') console.log(`[browser ${message.type()}] ${message.text()}`);
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
  const row = page.getByRole('row').filter({ hasText: basename(file!) }).first();
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
  await lines.first().getByRole('button').click();
  await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible({ timeout: 15_000 });
  await page.getByRole('button', { name: 'Pause' }).click();

  // Clean up: the recording and its audio.
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Delete this recording' }).click();
  await expect(page.getByRole('heading', { name: 'Recordings' })).toBeVisible();
  await expect(page.getByRole('row').filter({ hasText: basename(file!) })).toHaveCount(0);
});
