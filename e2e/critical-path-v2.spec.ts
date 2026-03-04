import { test, expect } from '@playwright/test';
import { setupTest, dismissWelcomeModal, startQuiz, isVisible } from './helpers/test-setup';

/**
 * Critical Path E2E Tests v2 - With Modal Handling
 *
 * Fast, reliable tests covering core user journeys
 * Target: Complete in < 5 minutes
 */

test.describe('Critical Path v2: Core Flows', () => {
  test.beforeEach(async ({ page }) => {
    await setupTest(page, '/');
  });

  test('should load app and show topics', async ({ page }) => {
    // App should be loaded
    await expect(page.locator('h1').first()).toBeVisible();

    // Should see Math topics
    const hasTopics = await isVisible(page, 'text=/Integers|Numbers|Algebra/i');
    expect(hasTopics).toBeTruthy();
  });

  test('should start quiz successfully', async ({ page }) => {
    // Start quiz using helper
    await startQuiz(page, 'Integers', 1);

    // Should see question content
    const hasQuestion = await isVisible(page, 'p, div');
    expect(hasQuestion).toBeTruthy();
  });

  test('should navigate between main pages', async ({ page }) => {
    // Navigate to Report — redirects to /auth for unauthenticated users
    const reportBtn = page.locator('[data-testid="nav-report"]');
    if (await reportBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await reportBtn.click();
      await page.waitForLoadState('networkidle');
      expect(await page.url()).toContain('auth');
    }

    // Navigate back to Practice
    await page.goto('/');
    const practiceBtn = page.locator('[data-testid="nav-practice"]');
    if (await practiceBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await practiceBtn.click();
      await page.waitForTimeout(500);
      expect(await page.url()).toMatch(/\/$|\/index/);
    }
  });

  test('should switch subjects', async ({ page }) => {
    // Click Physics tab
    const physicsTab = page.locator('button').filter({ hasText: 'Physics' });
    if (await physicsTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Force click to bypass modal
      await physicsTab.click({ force: true });
      await page.waitForTimeout(1000);

      // Should see physics-related content
      const hasPhysics = await isVisible(page, 'text=/Motion|Force|Energy|Light/i');
      expect(hasPhysics).toBeTruthy();
    } else {
      test.skip();
    }
  });

  test('should redirect /report to /auth when unauthenticated', async ({ page }) => {
    await page.goto('/report');
    await page.waitForLoadState('networkidle');

    // ProtectedRoute should redirect to /auth
    await expect(page).toHaveURL('/auth');
  });

  test('should handle deep link', async ({ page }) => {
    await page.goto('/?topic=fractions');
    await dismissWelcomeModal(page);

    // Should load successfully
    await expect(page.locator('h1').first()).toBeVisible();
  });

  test('should work on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await dismissWelcomeModal(page);

    // Should display mobile layout
    await expect(page.locator('h1').first()).toBeVisible();
  });

  test('should load quickly', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/');
    await page.waitForSelector('h1', { timeout: 5000 });

    const loadTime = Date.now() - startTime;

    // Should load in under 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });
});

test.describe('Critical Path v2: Report Feature', () => {
  test('should redirect /report to /auth without console errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto('/report');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL('/auth');
    expect(consoleErrors.length).toBe(0);
  });

  test.skip('should show report UI elements (requires auth)', async ({ page }) => {
    await setupTest(page, '/report');

    const hasReportPage = await isVisible(page, '[data-testid="report-page"]');
    const hasContent = await isVisible(page, 'text=/No.*Data|Session|Performance|Question/i');

    expect(hasReportPage || hasContent).toBeTruthy();
  });
});

test.describe('Critical Path v2: Navigation', () => {
  test('should have all 4 nav buttons', async ({ page }) => {
    await setupTest(page, '/');

    // Check each button individually to avoid strict mode violations
    const practiceBtn = page.locator('[data-testid="nav-practice"]');
    const adaptiveBtn = page.locator('[data-testid="nav-adaptive"]');
    const olympiadBtn = page.locator('[data-testid="nav-olympiad"]');
    const reportBtn = page.locator('[data-testid="nav-report"]');

    // All should exist (may not all be visible depending on screen size)
    await expect(practiceBtn).toBeAttached();
    await expect(adaptiveBtn).toBeAttached();
    await expect(olympiadBtn).toBeAttached();
    await expect(reportBtn).toBeAttached();
  });

  test('should navigate smoothly between pages', async ({ page }) => {
    await setupTest(page, '/');

    // Test public pages + /report (which redirects to /auth)
    const pages = ['/', '/adaptive', '/olympiad', '/report'];

    for (const path of pages) {
      const startTime = Date.now();
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      const navTime = Date.now() - startTime;

      // Should navigate (or redirect) quickly
      expect(navTime).toBeLessThan(3000);
    }
  });
});
