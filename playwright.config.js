// Playwright config for paris-sportif e2e tests.
//
// Strategy : spin up a tiny static HTTP server on port 8765 that serves the
// repo root (where pronostics.html + data.js live), then run all specs
// against `http://localhost:8765/pronostics.html`. No build step needed.
//
// Run locally :    npx playwright test
// Run in CI    :   handled by .github/workflows/e2e.yml (Ubuntu, Chromium only).

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['list']] : 'html',
  timeout: 30_000,

  use: {
    baseURL: 'http://localhost:8765',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    launchOptions: process.env.CHROME_EXECUTABLE_PATH ? {
      executablePath: process.env.CHROME_EXECUTABLE_PATH,
    } : undefined,
  },

  projects: [
    {
      name: 'chromium-desktop',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-chromium',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'firefox-desktop',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit-desktop',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'iphone-13',
      use: { ...devices['iPhone 13'] },
    },
    {
      name: 'ipad',
      use: { ...devices['iPad Pro 11'] },
    },
  ],

  webServer: {
    command: 'python -m http.server 8765',
    port: 8765,
    timeout: 10_000,
    reuseExistingServer: !process.env.CI,
  },
});
