// Playwright config for the standalone desktop app.
//
// The legacy website specs live in ./tests, but the product focus is now the
// Electron application. `npx playwright test` must stay short, deterministic
// and useful for the local desktop cockpit.

import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './desktop/tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'list',
  timeout: 90_000,

  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
});
