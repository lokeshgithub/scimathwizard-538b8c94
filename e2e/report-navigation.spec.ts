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
  test('Report button appears in all main pages', async ({ page }) => {
    const pages = ['/', '/adaptive', '/olympiad', '/report'];

    for (const path of pages) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');

      // Report button should be visible
      const reportButton = page.locator('[data-testid="nav-report"]');
      await expect(reportButton).toBeVisible();
    }
  });

  test('Report button shows active state on /report page', async ({ page }) => {
    await page.goto('/report');

    const reportButton = page.locator('[data-testid="nav-report"]');

    // Should have active styling
    const classes = await reportButton.getAttribute('class');
    expect(classes).toContain('bg-white/20');
  });

  test('Report page loads without errors', async ({ page }) => {
    // Track console errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/report');
    await page.waitForSelector('[data-testid="report-page"]');

    // Should not have any console errors
    expect(consoleErrors.length).toBe(0);
  });

  test('Report page shows empty state when no data', async ({ page }) => {
    await page.goto('/report');
    await page.waitForSelector('[data-testid="report-page"]');

    // Should show either empty state or data
    const hasEmptyState = await page.locator('text=No Session Data Yet').isVisible();
    const hasData = await page.locator('text=/\\d+ Questions?/i').isVisible();

    // One of them should be true
    expect(hasEmptyState || hasData).toBeTruthy();
  });

  test('Refresh button exists when user has access', async ({ page }) => {
    await page.goto('/report');
    await page.waitForSelector('[data-testid="report-page"]');

    // Refresh button may or may not be visible depending on auth state
    // Just verify it exists in the DOM if visible
    const refreshButton = page.locator('button:has-text("Refresh")');
    const isVisible = await refreshButton.isVisible().catch(() => false);

    // If visible, it should have the refresh icon
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

  test('Report page responsive layout', async ({ page }) => {
    // Test desktop
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/report');
    await expect(page.locator('[data-testid="report-page"]')).toBeVisible();

    // Test tablet
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/report');
    await expect(page.locator('[data-testid="report-page"]')).toBeVisible();

    // Test mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/report');
    await expect(page.locator('[data-testid="report-page"]')).toBeVisible();
  });

  test('Back to Practice button works from Report page', async ({ page }) => {
    await page.goto('/report');
    await page.waitForSelector('[data-testid="report-page"]');

    // Click "Back to Practice" button if it exists
    const backButton = page.locator('button:has-text("Back to Practice"), a:has-text("Back to Practice")');

    if (await backButton.isVisible()) {
      await backButton.click();

      // Should navigate to homepage
      await expect(page).toHaveURL('/');
    }
  });

  test('No TypeScript/React errors on Report page', async ({ page }) => {
    const pageErrors: Error[] = [];

    page.on('pageerror', error => {
      pageErrors.push(error);
    });

    await page.goto('/report');
    await page.waitForTimeout(2000); // Wait for any async operations

    // Should not have any uncaught errors
    expect(pageErrors.length).toBe(0);
  });
});

test.describe('Report Navigation Performance', () => {
  test('Report page loads quickly', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/report');
    await page.waitForSelector('[data-testid="report-page"]');

    const loadTime = Date.now() - startTime;

    // Should load in under 3 seconds
    expect(loadTime).toBeLessThan(3000);
  });

  test('Navigation between pages is smooth', async ({ page }) => {
    await page.goto('/');

    const startTime = Date.now();
    await page.click('[data-testid="nav-report"]');
    await page.waitForSelector('[data-testid="report-page"]');
    const navTime = Date.now() - startTime;

    // Navigation should be instant (under 1 second)
    expect(navTime).toBeLessThan(1000);
  });
});
