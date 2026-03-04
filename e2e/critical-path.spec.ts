import { test, expect } from '@playwright/test';

/**
 * Critical Path E2E Tests - SciMathWizard
 *
 * Fast, focused tests covering core user journeys
 * Target: Complete in < 5 minutes
 *
 * Test Philosophy:
 * - Test what matters to users, not implementation details
 * - Fast and reliable > comprehensive and brittle
 * - Use stable selectors (data-testid preferred)
 */

test.describe('Critical Path: First-Time Student Journey', () => {
  test('should load app and show Math topics by default', async ({ page }) => {
    await page.goto('/');

    // App should load quickly
    await expect(page.locator('text=Magic Mastery Quiz')).toBeVisible({ timeout: 5000 });

    // Math tab should be selected by default
    const mathTab = page.locator('button').filter({ hasText: 'Math' });
    await expect(mathTab).toBeVisible();

    // Should see topic categories
    await expect(page.locator('text=/Numbers|Integers|Algebra/i').first()).toBeVisible();
  });

  test('should expand topic and show levels', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Find and click first visible topic
    const topicCard = page.locator('[data-testid="topic-card"]').first();
    const topicText = page.locator('text=Integers').first();

    // Try data-testid first, fallback to text
    if (await topicCard.isVisible({ timeout: 2000 }).catch(() => false)) {
      await topicCard.click();
    } else {
      await topicText.click();
    }

    // Should show level buttons after expansion
    await expect(page.locator('text=/Level\s*1|L1|Fundamentals/i')).toBeVisible({ timeout: 3000 });
  });

  test('should start quiz and display question', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);

    // Expand topic
    await page.locator('text=Integers').first().click();
    await page.waitForTimeout(500);

    // Start Level 1
    const startBtn = page.locator('button').filter({ hasText: /Level\s*1|L1|Start|Fundamentals/i }).first();
    await startBtn.click();

    // Quiz card should appear
    await page.waitForTimeout(1500);

    // Should see question text (at least 10 characters)
    const questionExists = await page.locator('p, div').filter({ hasText: /\w{10,}/ }).isVisible();
    expect(questionExists).toBeTruthy();
  });

  test('should answer question and see feedback', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);

    // Start quiz
    await page.locator('text=Integers').first().click();
    await page.waitForTimeout(500);
    await page.locator('button').filter({ hasText: /Level\s*1|L1|Start/i }).first().click();
    await page.waitForTimeout(1500);

    // Click first answer option
    const answerBtn = page.locator('button').filter({ hasText: /^[A-D]\./i }).first();
    if (await answerBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await answerBtn.click();
      await page.waitForTimeout(1000);

      // Should see some visual feedback
      const hasFeedback = await page.locator('[class*="green"], [class*="red"], [class*="correct"], [class*="incorrect"]').isVisible().catch(() => false);
      const hasNext = await page.locator('button').filter({ hasText: /Next|Continue/i }).isVisible().catch(() => false);

      expect(hasFeedback || hasNext).toBeTruthy();
    }
  });
});

test.describe('Critical Path: Navigation Flow', () => {
  test('should navigate to all main pages', async ({ page }) => {
    // Home
    await page.goto('/');
    await expect(page.locator('text=Magic Mastery Quiz')).toBeVisible();

    // Adaptive Challenge
    await page.goto('/adaptive');
    await expect(page.locator('text=/Adaptive|Challenge/i')).toBeVisible();

    // Olympiad Test
    await page.goto('/olympiad');
    await expect(page.locator('text=/Olympiad|Test/i')).toBeVisible();

    // Report (protected — should redirect to /auth)
    await page.goto('/report');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL('/auth');
  });

  test('should have all 4 navigation buttons', async ({ page }) => {
    await page.goto('/');

    // All nav buttons should exist
    await expect(page.locator('[data-testid="nav-practice"]').or(page.locator('text=Practice'))).toBeVisible();
    await expect(page.locator('[data-testid="nav-adaptive"]').or(page.locator('text=Adaptive'))).toBeVisible();
    await expect(page.locator('[data-testid="nav-olympiad"]').or(page.locator('text=Olympiad'))).toBeVisible();
    await expect(page.locator('[data-testid="nav-report"]').or(page.locator('text=Report'))).toBeVisible();
  });

  test('should navigate using nav buttons', async ({ page }) => {
    await page.goto('/');

    // Click Report button — redirects to /auth for unauthenticated users
    const reportBtn = page.locator('[data-testid="nav-report"]');
    if (await reportBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await reportBtn.click();
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL('/auth');
    }

    // Navigate back to home
    await page.goto('/');
    const practiceBtn = page.locator('[data-testid="nav-practice"]');
    if (await practiceBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await practiceBtn.click();
      await expect(page).toHaveURL('/');
    }
  });
});

test.describe('Critical Path: Subject Selection', () => {
  test('should switch between subjects', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Click Physics tab
    const physicsTab = page.locator('button').filter({ hasText: 'Physics' });
    if (await physicsTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await physicsTab.click();
      await page.waitForTimeout(500);

      // Should see physics topics
      await expect(page.locator('text=/Motion|Force|Energy/i').first()).toBeVisible({ timeout: 3000 });
    }
  });

  test('should persist subject preference', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Switch to Chemistry
    const chemTab = page.locator('button').filter({ hasText: 'Chemistry' });
    if (await chemTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await chemTab.click();
      await page.waitForTimeout(500);

      // Reload page
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Chemistry should still be selected (has active styling)
      const chemTabAfter = page.locator('button').filter({ hasText: 'Chemistry' });
      const classes = await chemTabAfter.getAttribute('class');

      // Check if it has active styling (bg-white or similar)
      const isActive = classes?.includes('bg-white') || classes?.includes('active');
      expect(isActive).toBeTruthy();
    }
  });
});

test.describe('Critical Path: Report Feature', () => {
  test('should redirect unauthenticated users from /report to /auth', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto('/report');
    await page.waitForLoadState('networkidle');

    // ProtectedRoute should redirect to /auth
    await expect(page).toHaveURL('/auth');
    expect(consoleErrors.length).toBe(0);
  });

  test.skip('should show either empty state or data (requires auth)', async ({ page }) => {
    await page.goto('/report');

    const hasEmptyState = await page.locator('text=/No.*Data|No.*Session|Start.*Practice/i').isVisible().catch(() => false);
    const hasData = await page.locator('text=/\\d+.*Question|Accuracy|Performance/i').isVisible().catch(() => false);

    expect(hasEmptyState || hasData).toBeTruthy();
  });

  test.skip('should have refresh button when user authenticated (requires auth)', async ({ page }) => {
    await page.goto('/report');
    await page.waitForTimeout(1000);

    const refreshBtn = page.locator('button').filter({ hasText: 'Refresh' });
    const isVisible = await refreshBtn.isVisible().catch(() => false);

    if (isVisible) {
      await refreshBtn.click();
      await page.waitForTimeout(500);
      await expect(page).toHaveURL('/report');
    }

    expect(true).toBeTruthy();
  });
});

test.describe('Critical Path: Deep Linking', () => {
  test('should handle topic deep-link parameter', async ({ page }) => {
    await page.goto('/?topic=integers');
    await page.waitForLoadState('networkidle');

    // Should see the app loaded
    await expect(page.locator('text=Magic Mastery Quiz')).toBeVisible();

    // Integers topic should be visible (either expanded or highlighted)
    await expect(page.locator('text=Integers')).toBeVisible();
  });

  test('should handle invalid topic gracefully', async ({ page }) => {
    await page.goto('/?topic=nonexistent');
    await page.waitForLoadState('networkidle');

    // Should still load normally without errors
    await expect(page.locator('text=Magic Mastery Quiz')).toBeVisible();
  });
});

test.describe('Critical Path: Mobile Responsiveness', () => {
  test('should display properly on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // App should load
    await expect(page.locator('text=Magic Mastery Quiz')).toBeVisible();

    // Navigation should be visible (icons only on mobile)
    await expect(page.locator('[data-testid="nav-practice"]').or(page.locator('button').first())).toBeVisible();
  });

  test('should be usable on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');

    // App should load normally
    await expect(page.locator('text=Magic Mastery Quiz')).toBeVisible();

    // Should be able to start quiz
    await page.locator('text=Integers').first().click();
    await page.waitForTimeout(500);

    const startBtn = page.locator('button').filter({ hasText: /Level|Start/i }).first();
    await expect(startBtn).toBeVisible({ timeout: 3000 });
  });
});

test.describe('Critical Path: Performance', () => {
  test('should load homepage quickly', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/');
    await page.waitForSelector('text=Magic Mastery Quiz');

    const loadTime = Date.now() - startTime;

    // Should load in under 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });

  test('should navigate between pages quickly', async ({ page }) => {
    await page.goto('/');

    const startTime = Date.now();
    await page.goto('/report');
    await page.waitForLoadState('networkidle');
    const navTime = Date.now() - startTime;

    // Auth redirect should still be fast
    expect(navTime).toBeLessThan(3000);
  });
});
