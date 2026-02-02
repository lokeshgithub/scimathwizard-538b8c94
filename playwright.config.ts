import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Test Configuration for SciMathWizard
 *
 * Target: ICSE students (Class 7-12) using Chrome on tablets and laptops
 * Devices: iPad, Android tablets, MacBook, Windows laptops
 */
export default defineConfig({
  testDir: './e2e',

  /* Run tests in files in parallel */
  fullyParallel: true,

  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,

  /* Opt out of parallel tests on CI */
  workers: process.env.CI ? 1 : undefined,

  /* Reporter to use */
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
  ],

  /* Shared settings for all the projects below */
  use: {
    /* Base URL to use in actions like `await page.goto('/')` */
    baseURL: 'http://localhost:8081',

    /* Collect trace when retrying the failed test */
    trace: 'on-first-retry',

    /* Screenshot on failure */
    screenshot: 'only-on-failure',

    /* Video on failure */
    video: 'on-first-retry',
  },

  /* Configure projects for major browsers and devices */
  projects: [
    // Desktop - Primary targets for ICSE students
    {
      name: 'Desktop Chrome',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
      },
    },

    // MacBook - Common among students
    {
      name: 'MacBook Pro',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1512, height: 982 },
        deviceScaleFactor: 2,
      },
    },

    // Windows Laptop - Most common
    {
      name: 'Windows Laptop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1366, height: 768 },
      },
    },

    // Tablets - Very common for students
    {
      name: 'iPad Pro',
      use: {
        ...devices['iPad Pro 11'],
      },
    },

    {
      name: 'iPad Mini',
      use: {
        ...devices['iPad Mini'],
      },
    },

    // Android Tablet
    {
      name: 'Android Tablet',
      use: {
        ...devices['Galaxy Tab S4'],
      },
    },

    // Mobile - For quick practice sessions
    {
      name: 'iPhone 14',
      use: {
        ...devices['iPhone 14'],
      },
    },

    {
      name: 'Android Phone',
      use: {
        ...devices['Pixel 5'],
      },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:8081',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
