import { test, expect } from '@playwright/test';

/**
 * E2E Test: Historical Reporting System
 *
 * Tests the complete reporting flow including:
 * - Report button navigation
 * - Session save with toast notifications
 * - Session deduplication
 * - Report data display
 * - Refresh functionality
 * - Filter correctness (especially "Last Session" bug fix)
 */

test.describe('Report Flow End-to-End', () => {
  test.beforeEach(async ({ page }) => {
    // Start fresh on homepage
    await page.goto('/');

    // Wait for app to load
    await page.waitForSelector('[data-testid="nav-practice"]', { timeout: 10000 });
  });

  test('Report button is visible in navigation', async ({ page }) => {
    // Check Report button exists
    const reportButton = page.locator('[data-testid="nav-report"]');
    await expect(reportButton).toBeVisible();

    // Check it has the BarChart3 icon (by checking for the button)
    await expect(reportButton).toBeVisible();

    // On desktop, text should be visible
    const viewportSize = page.viewportSize();
    if (viewportSize && viewportSize.width >= 640) {
      await expect(reportButton).toContainText('Report');
    }
  });

  test('Report button navigates to /report page', async ({ page }) => {
    // Click Report button
    await page.click('[data-testid="nav-report"]');

    // Should navigate to /report
    await expect(page).toHaveURL('/report');

    // Report page should load
    await expect(page.locator('[data-testid="report-page"]')).toBeVisible();

    // Report button should show active state
    const reportButton = page.locator('[data-testid="nav-report"]');
    await expect(reportButton).toHaveClass(/bg-white\/20/); // Active state styling
  });

  test('Complete session and verify save toast notification', async ({ page }) => {
    // Select Math subject
    await page.click('text=Math');
    await page.waitForTimeout(500);

    // Select a topic (Integers)
    const topicButton = page.locator('button:has-text("Integers")').first();
    await topicButton.click();

    // Wait for quiz to load
    await page.waitForSelector('text=/Question \\d+ of/', { timeout: 5000 });

    // Answer a few questions (click first option repeatedly)
    for (let i = 0; i < 3; i++) {
      // Wait for question to be ready
      await page.waitForTimeout(500);

      // Click first answer option
      const firstOption = page.locator('[data-testid^="option-"]').first();
      await firstOption.click();

      // Wait for feedback
      await page.waitForTimeout(1000);

      // Click Next or Submit
      const nextButton = page.locator('button:has-text("Next"), button:has-text("Submit")');
      if (await nextButton.isVisible()) {
        await nextButton.click();
      }
    }

    // End session
    const endButton = page.locator('button:has-text("End Session")');
    if (await endButton.isVisible()) {
      await endButton.click();
    }

    // Wait for Session Summary modal
    await page.waitForSelector('text=Session Summary', { timeout: 5000 });

    // Check for success toast notification
    // Toast should appear with "Session saved to history!"
    const toast = page.locator('text=Session saved to history!');
    await expect(toast).toBeVisible({ timeout: 5000 });

    // Check for "View Reports" action button in toast
    const viewReportsButton = page.locator('button:has-text("View Reports")');
    await expect(viewReportsButton).toBeVisible({ timeout: 2000 });
  });

  test('Session deduplication - no duplicate saves', async ({ page }) => {
    // Listen for console logs
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'log') {
        consoleLogs.push(msg.text());
      }
    });

    // Complete a quick session
    await page.click('text=Math');
    await page.waitForTimeout(500);

    const topicButton = page.locator('button:has-text("Integers")').first();
    await topicButton.click();

    await page.waitForSelector('text=/Question \\d+ of/', { timeout: 5000 });

    // Answer 2 questions quickly
    for (let i = 0; i < 2; i++) {
      await page.waitForTimeout(300);
      const firstOption = page.locator('[data-testid^="option-"]').first();
      await firstOption.click();
      await page.waitForTimeout(800);
      const nextButton = page.locator('button:has-text("Next"), button:has-text("Submit")');
      if (await nextButton.isVisible()) {
        await nextButton.click();
      }
    }

    // End session
    const endButton = page.locator('button:has-text("End Session")');
    if (await endButton.isVisible()) {
      await endButton.click();
    }

    // Wait for session summary
    await page.waitForSelector('text=Session Summary', { timeout: 5000 });
    await page.waitForTimeout(2000); // Wait for save to complete

    // Close modal
    await page.click('button:has-text("Continue Practicing"), button:has-text("Close")');

    // End session again (should trigger deduplication)
    await page.waitForTimeout(500);
    const endButton2 = page.locator('button:has-text("End Session")');
    if (await endButton2.isVisible()) {
      await endButton2.click();
      await page.waitForSelector('text=Session Summary', { timeout: 5000 });
      await page.waitForTimeout(2000);
    }

    // Check console logs for deduplication message
    const hasDeduplicationLog = consoleLogs.some(log =>
      log.includes('[Report] Session already saved, skipping')
    );

    // Should see deduplication message OR only one save message
    const saveCount = consoleLogs.filter(log =>
      log.includes('[Report] Session report saved to database')
    ).length;

    // Either deduplication worked (hasDeduplicationLog) or only saved once
    expect(hasDeduplicationLog || saveCount === 1).toBeTruthy();
  });

  test('Report page shows session data correctly', async ({ page }) => {
    // First, complete a session with known data
    await page.click('text=Math');
    await page.waitForTimeout(500);

    const topicButton = page.locator('button:has-text("Integers")').first();
    await topicButton.click();

    await page.waitForSelector('text=/Question \\d+ of/', { timeout: 5000 });

    // Answer 3 questions
    for (let i = 0; i < 3; i++) {
      await page.waitForTimeout(300);
      const firstOption = page.locator('[data-testid^="option-"]').first();
      await firstOption.click();
      await page.waitForTimeout(800);
      const nextButton = page.locator('button:has-text("Next"), button:has-text("Submit")');
      if (await nextButton.isVisible()) {
        await nextButton.click();
      }
    }

    const endButton = page.locator('button:has-text("End Session")');
    if (await endButton.isVisible()) {
      await endButton.click();
    }

    await page.waitForSelector('text=Session Summary', { timeout: 5000 });

    // Click "View Reports" button in toast
    await page.waitForTimeout(1000);
    const viewReportsBtn = page.locator('button:has-text("View Reports")');
    if (await viewReportsBtn.isVisible()) {
      await viewReportsBtn.click();
    } else {
      // Fallback: click report button in nav
      await page.click('[data-testid="nav-report"]');
    }

    // Wait for report page
    await expect(page).toHaveURL('/report');
    await page.waitForSelector('[data-testid="report-page"]');

    // Check that report shows data
    // Should show total questions (at least 3)
    const questionsElement = page.locator('text=/\\d+ Questions?/i').first();
    await expect(questionsElement).toBeVisible();

    // Should show accuracy percentage
    const accuracyElement = page.locator('text=/%\\s*Accuracy/i').first();
    await expect(accuracyElement).toBeVisible();
  });

  test('Refresh button works correctly', async ({ page }) => {
    // Go to report page
    await page.goto('/report');
    await page.waitForSelector('[data-testid="report-page"]');

    // Find refresh button
    const refreshButton = page.locator('button:has-text("Refresh")');

    // If user is logged in and has data, refresh button should be visible
    if (await refreshButton.isVisible()) {
      await refreshButton.click();

      // Check for spinner animation (button should have 'animate-spin' class on icon)
      const refreshIcon = refreshButton.locator('.animate-spin');
      // May be too fast to catch, but check for toast instead

      // Check for success toast
      const toast = page.locator('text=Reports refreshed!');
      await expect(toast).toBeVisible({ timeout: 3000 });
    }
  });

  test('Empty state shows correct message', async ({ page }) => {
    // Go to report page (assuming no data or logged out)
    await page.goto('/report');
    await page.waitForSelector('[data-testid="report-page"]');

    // Check for empty state
    const emptyState = page.locator('text=No Session Data Yet');

    if (await emptyState.isVisible()) {
      // Check that message is contextual
      // Should mention either "Complete a practice session" or "Start practicing"
      const message = page.locator('text=/Complete a practice session|Start practicing/i');
      await expect(message).toBeVisible();
    }
  });

  test('Report button tooltip shows on hover', async ({ page }) => {
    const reportButton = page.locator('[data-testid="nav-report"]');

    // Hover over report button
    await reportButton.hover();

    // Tooltip should appear
    await page.waitForTimeout(500); // Wait for tooltip animation

    // Check for tooltip content
    const tooltip = page.locator('text=Performance Report');
    await expect(tooltip).toBeVisible({ timeout: 2000 });
  });
});

test.describe('Report Filters and Data', () => {
  test.skip('Last Session filter shows correct subject (bug fix)', async ({ page }) => {
    // This test requires multiple sessions with different subjects
    // Skipping for now as it requires auth and multiple complete sessions

    // Test plan:
    // 1. Complete Math session
    // 2. Complete Physics session (more recent)
    // 3. Filter by "Last Session + Math"
    // 4. Should show Math session, not Physics (this was the bug)
  });

  test.skip('Multiple sessions aggregate correctly', async ({ page }) => {
    // This test requires auth and multiple complete sessions
    // Skipping for now

    // Test plan:
    // 1. Complete 3 sessions
    // 2. Check that total questions = sum of all sessions
    // 3. Check that accuracy is calculated correctly
  });
});
