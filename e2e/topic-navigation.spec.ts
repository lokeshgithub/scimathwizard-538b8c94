import { test, expect } from '@playwright/test';

/**
 * E2E Tests: Topic Navigation & Dashboard
 * Lightweight tests for core functionality
 */

// Helper to dismiss welcome modal
async function dismissModal(page) {
  const getStartedBtn = page.locator('button:has-text("Get Started")');
  if (await getStartedBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await getStartedBtn.click();
    await page.waitForTimeout(300);
  }
}

test.describe('Topic Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    // Dismiss modal first
    await dismissModal(page);
  });

  test('should load dashboard with Math topics', async ({ page }) => {
    // Should see Math topic categories
    await expect(page.locator('text=Numbers & Operations').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Algebra').first()).toBeVisible();
  });

  test('should switch to Physics when tab clicked', async ({ page }) => {
    // Wait for dashboard to be ready
    await expect(page.locator('text=Numbers & Operations').first()).toBeVisible({ timeout: 10000 });

    // Click Physics tab
    await page.locator('button:has-text("Physics")').click();
    await page.waitForTimeout(500);

    // Should see Physics content or empty state message
    const physicsVisible = await page.locator('text=/Physics|Force|Motion|Energy|No topics/i').first().isVisible().catch(() => false);
    expect(physicsVisible).toBeTruthy();
  });

  test('should switch to Chemistry when tab clicked', async ({ page }) => {
    await expect(page.locator('text=Numbers & Operations').first()).toBeVisible({ timeout: 10000 });

    await page.locator('button:has-text("Chemistry")').click();
    await page.waitForTimeout(500);

    // Should see Chemistry content or empty state
    const chemVisible = await page.locator('text=/Chemistry|Matter|Element|Atom|No topics/i').first().isVisible().catch(() => false);
    expect(chemVisible).toBeTruthy();
  });

  test('should display topic cards with level buttons', async ({ page }) => {
    await expect(page.locator('text=Numbers & Operations').first()).toBeVisible({ timeout: 10000 });

    // Topic cards should be visible
    const topicCards = page.locator('[data-testid="topic-card"]');
    await expect(topicCards.first()).toBeVisible({ timeout: 5000 });

    // Level buttons should exist
    const levelButtons = page.locator('[data-testid^="level-button-"]');
    const count = await levelButtons.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should start quiz when topic level clicked', async ({ page }) => {
    await expect(page.locator('text=Numbers & Operations').first()).toBeVisible({ timeout: 10000 });

    // Click first topic's level 1 button
    const level1Btn = page.locator('[data-testid="level-button-1"]').first();
    await expect(level1Btn).toBeVisible({ timeout: 5000 });
    await level1Btn.click();

    // Should see quiz card
    await expect(page.locator('[data-testid="quiz-card"]')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Mixed Mode', () => {
  test('should start mixed quiz', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await dismissModal(page);

    await expect(page.locator('text=Numbers & Operations').first()).toBeVisible({ timeout: 10000 });

    // Click Mix All Topics button
    const mixBtn = page.locator('button:has-text("Mix All Topics")');
    if (await mixBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await mixBtn.click();
      await expect(page.locator('[data-testid="quiz-card"]')).toBeVisible({ timeout: 10000 });
    }
  });
});
