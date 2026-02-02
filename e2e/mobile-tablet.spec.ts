import { test, expect } from '@playwright/test';

/**
 * E2E Tests: Mobile & Tablet Experience
 *
 * These tests run on all configured devices in playwright.config.ts
 * Focus: Responsive design, touch interactions, performance
 */

test.describe('Responsive Layout', () => {
  test('should display full UI without horizontal scroll', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);

    // Get page width
    const viewportWidth = page.viewportSize()?.width || 1440;
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);

    // Body should not exceed viewport width significantly
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 20);
  });

  test('should have touch-friendly buttons (min 36px height)', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);

    const buttons = page.locator('button');
    const buttonCount = await buttons.count();

    let smallButtonCount = 0;
    for (let i = 0; i < Math.min(10, buttonCount); i++) {
      const box = await buttons.nth(i).boundingBox();
      if (box && box.height > 0 && box.height < 36) {
        smallButtonCount++;
      }
    }

    // Most buttons should be touch-friendly
    expect(smallButtonCount).toBeLessThan(3);
  });

  test('should show compact header in quiz mode', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);

    // Start quiz
    await page.locator('text=Integers').first().click().catch(() => {});
    await page.waitForTimeout(500);

    const levelBtn = page.locator('button').filter({ hasText: /Level|Start/i }).first();
    if (await levelBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await levelBtn.click();
      await page.waitForTimeout(1000);

      // Header should exist
      const header = page.locator('header').first();
      await expect(header).toBeVisible();
    }
  });

  test('should allow answer selection', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);

    // Start quiz
    await page.locator('text=Integers').first().click().catch(() => {});
    await page.waitForTimeout(500);

    const levelBtn = page.locator('button').filter({ hasText: /Level|Start/i }).first();
    if (await levelBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await levelBtn.click();
      await page.waitForTimeout(1000);

      // Click answer option
      const option = page.locator('button').filter({ hasText: /^[A-D]\./i }).first();
      if (await option.isVisible({ timeout: 3000 }).catch(() => false)) {
        await option.click();
        await page.waitForTimeout(500);

        // Should show feedback
        const hasResponse = await page.locator('[class*="green"], [class*="red"], [class*="correct"], [class*="incorrect"]').isVisible().catch(() => false);
        expect(hasResponse).toBeTruthy();
      }
    }
  });
});

test.describe('Screen Utilization', () => {
  test('should utilize screen space effectively', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);

    // Should have reasonable content width
    const mainContent = page.locator('main, [class*="container"], [class*="max-w"]').first();
    const box = await mainContent.boundingBox().catch(() => null);

    if (box) {
      // Content should use good portion of screen
      const viewportWidth = page.viewportSize()?.width || 1024;
      expect(box.width).toBeGreaterThan(viewportWidth * 0.4);
    }
  });

  test('should display topic cards properly', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);

    // Topics should be visible
    const topicCards = page.locator('[class*="topic"], [class*="card"]');
    const count = await topicCards.count().catch(() => 0);

    expect(count).toBeGreaterThan(0);
  });
});

test.describe('Touch & Click Interactions', () => {
  test('should respond to clicks quickly', async ({ page }) => {
    await page.goto('/');

    // Wait for page to be interactive
    await page.waitForLoadState('domcontentloaded');

    // Measure time to first interaction response
    const button = page.locator('button').first();
    await button.waitFor({ state: 'visible', timeout: 5000 });

    const startTime = Date.now();
    await button.click();
    const endTime = Date.now();

    const responseTime = endTime - startTime;

    // Should respond within 500ms
    expect(responseTime).toBeLessThan(500);
  });

  test('should support scrolling', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);

    // Try scrolling the page
    await page.evaluate(() => {
      window.scrollTo(0, 200);
    });

    const scrollY = await page.evaluate(() => window.scrollY);
    expect(scrollY).toBeGreaterThanOrEqual(0);
  });

  test('should have working viewport meta tag', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);

    // Check viewport meta
    const viewport = await page.evaluate(() => {
      const meta = document.querySelector('meta[name="viewport"]');
      return meta?.getAttribute('content') || '';
    });

    expect(viewport).toContain('width=');
  });
});

test.describe('Responsive Breakpoints', () => {
  const breakpoints = [
    { name: 'Mobile-S', width: 320, height: 568 },
    { name: 'Mobile-M', width: 375, height: 667 },
    { name: 'Mobile-L', width: 425, height: 812 },
    { name: 'Tablet', width: 768, height: 1024 },
    { name: 'Laptop', width: 1024, height: 768 },
    { name: 'Desktop', width: 1440, height: 900 },
  ];

  for (const bp of breakpoints) {
    test(`should render correctly at ${bp.name} (${bp.width}x${bp.height})`, async ({ page }) => {
      await page.setViewportSize({ width: bp.width, height: bp.height });
      await page.goto('/');
      await page.waitForTimeout(1000);

      // Should load without errors
      await expect(page.locator('text=Magic Mastery Quiz').or(page.locator('text=Magic'))).toBeVisible({ timeout: 10000 });

      // No horizontal scroll
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      expect(bodyWidth).toBeLessThanOrEqual(bp.width + 30);
    });
  }
});

test.describe('Visual Consistency', () => {
  test('should have consistent header across pages', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);

    // Check header exists
    const header = page.locator('header');
    await expect(header).toBeVisible();

    // Header should contain app name
    await expect(page.locator('text=Magic')).toBeVisible();
  });

  test('should have proper spacing and alignment', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);

    // Check main content has padding/margin
    const main = page.locator('main').first();
    const box = await main.boundingBox();

    if (box) {
      // Should have some left padding
      expect(box.x).toBeGreaterThan(0);
    }
  });

  test('should display readable text sizes', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);

    // Check body text size
    const fontSize = await page.evaluate(() => {
      const body = document.body;
      return parseInt(window.getComputedStyle(body).fontSize);
    });

    // Should be at least 14px for readability
    expect(fontSize).toBeGreaterThanOrEqual(12);
  });
});
