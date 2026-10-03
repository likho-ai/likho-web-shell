import { defineConfig } from '@playwright/test';

// The whole product in a real browser, through the local gateway: the stack, the four services,
// likho-api and the three web dev servers must be running (see README, "Try it end to end").
export default defineConfig({
  testDir: 'e2e',
  timeout: 300_000,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: process.env.LIKHO_WEB_URL ?? 'http://localhost:8080',
    channel: 'chrome',
    headless: true,
    screenshot: 'only-on-failure',
    viewport: { width: 1280, height: 900 },
  },
});
