import { defineConfig, devices } from '@playwright/test';

/**
 * Lightweight Playwright Config for SciMathWizard
 *
 * Local dev: Single browser, sequential tests (fast, low memory)
 * CI: Can enable more browsers via FULL_TEST=1
 */
export default defineConfig({
  testDir: './e2e',

  /* Sequential by default - much lighter on resources */
  fullyParallel: false,
  workers: 1,

  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,

  /* Simple list reporter - no heavy HTML generation */
  reporter: process.env.CI ? [['html'], ['list']] : [['list']],

  /* Shared settings */
  use: {
    baseURL: 'http://localhost:8080',

    /* Disable heavy features for local dev */
    trace: 'off',
    screenshot: 'off',
    video: 'off',
  },

  /* Single browser for fast local testing */
  projects: process.env.FULL_TEST ? [
    // Full suite for CI/thorough testing
    { name: 'Desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'Tablet', use: { ...devices['iPad Mini'] } },
    { name: 'Mobile', use: { ...devices['iPhone 14'] } },
  ] : [
    // Just Chrome for quick local tests
    { name: 'Chrome', use: { ...devices['Desktop Chrome'] } },
  ],

  /* Reuse existing dev server */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:8080',
    reuseExistingServer: true,
    timeout: 60000,
  },
});
