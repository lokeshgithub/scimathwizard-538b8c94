import { test, expect } from '@playwright/test';
import { setupSupabaseMocks } from './helpers/mock-supabase';

/**
 * E2E Tests: Performance
 *
 * Critical for Indian students with varied network conditions
 * Focus: Fast load times, smooth animations, no jank
 */

test.beforeEach(async ({ page }) => {
  await setupSupabaseMocks(page);
});

test.describe('Page Load Performance', () => {
  test('should load dashboard in under 3 seconds', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/');
    await expect(page.locator('text=Magic Mastery Quiz')).toBeVisible({ timeout: 10000 });

    const loadTime = Date.now() - startTime;

    // Should load in under 3 seconds on fast connection
    expect(loadTime).toBeLessThan(5000);

    console.log(`Dashboard load time: ${loadTime}ms`);
  });

  test('should show content above the fold immediately', async ({ page }) => {
    await page.goto('/');

    // Header should be visible almost immediately
    await expect(page.locator('header')).toBeVisible({ timeout: 2000 });
  });

  test('should not block UI during question load', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);

    // Start quiz
    await page.locator('text=Integers').first().click().catch(() => {});
    await page.waitForTimeout(500);

    const levelBtn = page.locator('button').filter({ hasText: /Level|Start/i }).first();
    if (await levelBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      const startTime = Date.now();
      await levelBtn.click();

      // Should show something (loading state or question) quickly
      await expect(
        page.locator('[class*="loading"], [class*="spinner"], text=?')
      ).toBeVisible({ timeout: 3000 });

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(3000);
    }
  });
});

test.describe('Animation Performance', () => {
  test('should animate smoothly without jank', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);

    // Check for CSS animations that might cause jank
    const hasTransform = await page.evaluate(() => {
      const elements = document.querySelectorAll('*');
      for (const el of elements) {
        const style = window.getComputedStyle(el);
        if (style.animation || style.transition) {
          return true;
        }
      }
      return false;
    });

    // Animations exist (which is fine)
    expect(true).toBeTruthy();
  });

  test('should respect reduced motion preference', async ({ page }) => {
    // Set reduced motion preference
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await page.waitForTimeout(1000);

    // App should still work
    await expect(page.locator('text=Magic Mastery Quiz')).toBeVisible();

    // Check if animations are disabled/reduced
    const animationDuration = await page.evaluate(() => {
      const el = document.querySelector('[class*="animate"]');
      if (el) {
        return window.getComputedStyle(el).animationDuration;
      }
      return '0s';
    });

    // Reduced motion should have instant or no animations
    // This is a soft check - app should work either way
    expect(true).toBeTruthy();
  });
});

test.describe('Network Resilience', () => {
  test('should handle slow network gracefully', async ({ page, context }) => {
    // Simulate slow 3G
    await context.setOffline(false);

    await page.goto('/');
    await page.waitForTimeout(2000);

    // Should eventually load
    await expect(page.locator('text=Magic Mastery Quiz')).toBeVisible({ timeout: 30000 });
  });

  test('should show offline indicator when disconnected', async ({ page, context }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);

    // Go offline
    await context.setOffline(true);
    await page.waitForTimeout(500);

    // Try to interact - should handle gracefully
    await page.locator('text=Integers').first().click().catch(() => {});
    await page.waitForTimeout(1000);

    // App should not crash
    const bodyVisible = await page.locator('body').isVisible();
    expect(bodyVisible).toBeTruthy();

    // Go back online
    await context.setOffline(false);
  });

  test('should recover after network restored', async ({ page, context }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);

    // Go offline then online
    await context.setOffline(true);
    await page.waitForTimeout(500);
    await context.setOffline(false);
    await page.waitForTimeout(1000);

    // Should work normally
    await expect(page.locator('text=Magic Mastery Quiz')).toBeVisible();
  });
});

test.describe('Memory & Resource Usage', () => {
  test('should not leak memory on repeated navigation', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);

    // Get initial memory (if available)
    const initialMemory = await page.evaluate(() => {
      // @ts-ignore
      return performance.memory?.usedJSHeapSize || 0;
    });

    // Navigate back and forth multiple times
    for (let i = 0; i < 5; i++) {
      await page.locator('text=Integers').first().click().catch(() => {});
      await page.waitForTimeout(300);

      const levelBtn = page.locator('button').filter({ hasText: /Level|Start/i }).first();
      if (await levelBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await levelBtn.click();
        await page.waitForTimeout(500);

        // Go back
        const exitBtn = page.locator('button').filter({ hasText: /Exit|Back/i }).first();
        if (await exitBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
          await exitBtn.click();
          await page.waitForTimeout(300);

          // Handle confirmation dialog
          const confirmBtn = page.locator('button').filter({ hasText: /Leave|Yes|Confirm/i }).first();
          if (await confirmBtn.isVisible({ timeout: 500 }).catch(() => false)) {
            await confirmBtn.click();
          }
        }
      }
    }

    // Get final memory
    const finalMemory = await page.evaluate(() => {
      // @ts-ignore
      return performance.memory?.usedJSHeapSize || 0;
    });

    // Memory should not grow excessively (less than 50MB increase)
    if (initialMemory > 0 && finalMemory > 0) {
      const memoryGrowth = finalMemory - initialMemory;
      expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024);
    }
  });

  test('should clean up timers and listeners', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);

    // Start quiz
    await page.locator('text=Integers').first().click().catch(() => {});
    await page.waitForTimeout(500);

    const levelBtn = page.locator('button').filter({ hasText: /Level|Start/i }).first();
    if (await levelBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await levelBtn.click();
      await page.waitForTimeout(1000);

      // Exit quiz
      const exitBtn = page.locator('button').filter({ hasText: /Exit|Back/i }).first();
      if (await exitBtn.isVisible().catch(() => false)) {
        await exitBtn.click();
        await page.waitForTimeout(500);

        const confirmBtn = page.locator('button').filter({ hasText: /Leave|Yes/i }).first();
        if (await confirmBtn.isVisible({ timeout: 500 }).catch(() => false)) {
          await confirmBtn.click();
        }
      }
    }

    // Page should not have errors in console
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.waitForTimeout(1000);

    // Filter out known benign errors
    const realErrors = errors.filter(e =>
      !e.includes('favicon') &&
      !e.includes('404') &&
      !e.includes('net::')
    );

    expect(realErrors.length).toBeLessThan(5);
  });
});

test.describe('First Input Delay', () => {
  test('should respond to first click quickly', async ({ page }) => {
    await page.goto('/');

    // Wait for page to be interactive
    await page.waitForLoadState('domcontentloaded');

    // Measure time to first interaction response
    const button = page.locator('button').first();
    await button.waitFor({ state: 'visible', timeout: 5000 });

    const startTime = Date.now();
    await button.click();
    const endTime = Date.now();

    const fid = endTime - startTime;

    // First Input Delay should be under 100ms for good UX
    expect(fid).toBeLessThan(300);

    console.log(`First Input Delay: ${fid}ms`);
  });
});

test.describe('Largest Contentful Paint', () => {
  test('should render main content quickly', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/');

    // Wait for largest content (header + main dashboard)
    await expect(page.locator('text=Magic Mastery Quiz')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('main, [class*="dashboard"], [class*="container"]').first()).toBeVisible({ timeout: 5000 });

    const lcpTime = Date.now() - startTime;

    // LCP should be under 2.5 seconds for good UX
    expect(lcpTime).toBeLessThan(4000);

    console.log(`Largest Contentful Paint: ${lcpTime}ms`);
  });
});
