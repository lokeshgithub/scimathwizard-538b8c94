import { test, expect } from '@playwright/test';

/**
 * E2E Test: Report Navigation and UI Elements
 *
 * Focuses on testing the report feature additions that don't require
 * completing full quiz sessions:
 * - Report button in navigation
 * - Report page loading
 * - Empty states
 * - Refresh functionality
 * - Basic UI elements
 */

test.describe('Report Navigation and UI', () => {
  test('Report button appears in public pages', async ({ page }) => {
    // Only test pages that don't require auth
    const publicPages = ['/', '/adaptive', '/olympiad'];

    for (const path of publicPages) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');

      const reportButton = page.locator('[data-testid="nav-report"]');
      await expect(reportButton).toBeVisible();
    }
  });

  test('Report route redirects unauthenticated users to /auth', async ({ page }) => {
    await page.goto('/report');
    await page.waitForLoadState('networkidle');

    // ProtectedRoute should redirect to /auth
    await expect(page).toHaveURL('/auth');
  });

  // These tests require authentication — skip until auth helpers are available
  test.skip('Report button shows active state on /report page', async ({ page }) => {
    await page.goto('/report');

    const reportButton = page.locator('[data-testid="nav-report"]');
    const classes = await reportButton.getAttribute('class');
    expect(classes).toContain('bg-white/20');
  });

  test.skip('Report page loads without errors (requires auth)', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/report');
    await page.waitForSelector('[data-testid="report-page"]');
    expect(consoleErrors.length).toBe(0);
  });

  test.skip('Report page shows empty state when no data (requires auth)', async ({ page }) => {
    await page.goto('/report');
    await page.waitForSelector('[data-testid="report-page"]');

    const hasEmptyState = await page.locator('text=No Session Data Yet').isVisible();
    const hasData = await page.locator('text=/\\d+ Questions?/i').isVisible();
    expect(hasEmptyState || hasData).toBeTruthy();
  });

  test.skip('Refresh button exists when user has access (requires auth)', async ({ page }) => {
    await page.goto('/report');
    await page.waitForSelector('[data-testid="report-page"]');

    const refreshButton = page.locator('button:has-text("Refresh")');
    const isVisible = await refreshButton.isVisible().catch(() => false);

    if (isVisible) {
      const icon = refreshButton.locator('svg');
      await expect(icon).toBeVisible();
    }
  });

  test('PathwayNav includes all 4 navigation buttons', async ({ page }) => {
    await page.goto('/');

    // Should have Practice, Adaptive, Olympiad, and Report buttons
    await expect(page.locator('[data-testid="nav-practice"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-adaptive"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-olympiad"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-report"]')).toBeVisible();
  });

  test('Report button text hidden on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    const reportButton = page.locator('[data-testid="nav-report"]');
    await expect(reportButton).toBeVisible();

    // Text should be hidden (has 'hidden sm:inline' classes)
    const textSpan = reportButton.locator('span:has-text("Report")');
    const classes = await textSpan.getAttribute('class');

    // Should have 'hidden' class for mobile
    expect(classes).toContain('hidden');
  });

  test.skip('Report page responsive layout (requires auth)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/report');
    await expect(page.locator('[data-testid="report-page"]')).toBeVisible();
  });

  test.skip('Back to Practice button works from Report page (requires auth)', async ({ page }) => {
    await page.goto('/report');
    await page.waitForSelector('[data-testid="report-page"]');

    const backButton = page.locator('button:has-text("Back to Practice"), a:has-text("Back to Practice")');
    if (await backButton.isVisible()) {
      await backButton.click();
      await expect(page).toHaveURL('/');
    }
  });

  test('No uncaught errors on auth redirect from /report', async ({ page }) => {
    const pageErrors: Error[] = [];
    page.on('pageerror', error => {
      pageErrors.push(error);
    });

    await page.goto('/report');
    await page.waitForLoadState('networkidle');

    // ProtectedRoute redirect should not cause uncaught errors
    expect(pageErrors.length).toBe(0);
  });
});

test.describe('Report Navigation Performance', () => {
  test('Report redirect is fast', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/report');
    await page.waitForLoadState('networkidle');

    const loadTime = Date.now() - startTime;

    // Auth redirect should complete quickly
    expect(loadTime).toBeLessThan(3000);
    await expect(page).toHaveURL('/auth');
  });

  test('Navigation from home to report redirects smoothly', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const reportBtn = page.locator('[data-testid="nav-report"]');
    if (await reportBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      const startTime = Date.now();
      await reportBtn.click();
      await page.waitForLoadState('networkidle');
      const navTime = Date.now() - startTime;

      // Redirect should be fast
      expect(navTime).toBeLessThan(3000);
    }
  });
});
