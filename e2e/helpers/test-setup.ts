import { Page } from '@playwright/test';
import { setupSupabaseMocks } from './mock-supabase';

/**
 * Test Setup Helpers
 *
 * Common utilities for E2E tests to handle modals, waits, and navigation
 */

export { setupSupabaseMocks };

/**
 * Dismisses the welcome modal if present
 *
 * The app shows a welcome modal on first visit which blocks interactions.
 * This helper dismisses it so tests can proceed.
 */
export async function dismissWelcomeModal(page: Page): Promise<void> {
  try {
    // Wait a bit for modal to appear
    await page.waitForTimeout(1000);

    // Look for any modal dialog (with or without ARIA role)
    const modal = page.locator('[role="dialog"], [role="alertdialog"]').first();

    if (await modal.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Try multiple close button patterns
      const closeButtons = [
        modal.locator('button').filter({ hasText: /got it|start|close|dismiss|continue/i }),
        modal.locator('button[aria-label*="close"]'),
        modal.locator('button:has-text("×")'),
        modal.locator('button').last(), // Often the action button
      ];

      for (const btn of closeButtons) {
        if (await btn.first().isVisible({ timeout: 500 }).catch(() => false)) {
          await btn.first().click();
          await page.waitForTimeout(500);

          // Verify modal is gone
          if (!await modal.isVisible({ timeout: 1000 }).catch(() => true)) {
            return;
          }
        }
      }

      // If still visible, try clicking backdrop
      const backdrop = page.locator('.bg-black\\/60, [class*="backdrop"]').first();
      if (await backdrop.isVisible({ timeout: 500 }).catch(() => false)) {
        await backdrop.click({ position: { x: 5, y: 5 } });
        await page.waitForTimeout(500);
      }
    }

    // Fallback: welcome modal may not have role="dialog" — look for
    // a "Get Started" button directly on the page.
    const getStartedBtn = page.locator('button').filter({ hasText: /Get Started/i }).first();
    if (await getStartedBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await getStartedBtn.click();
      await page.waitForTimeout(500);
    }
  } catch (error) {
    // Modal dismissal is optional - don't fail test if it doesn't work
    console.log('Could not dismiss modal, continuing anyway');
  }
}

/**
 * Waits for the app to be fully loaded and ready for interaction
 */
export async function waitForAppReady(page: Page): Promise<void> {
  // Wait for main heading
  await page.waitForSelector('h1, [role="heading"]', { timeout: 10000 });

  // Wait for network to be idle
  await page.waitForLoadState('networkidle', { timeout: 10000 });

  // Give React time to hydrate
  await page.waitForTimeout(500);
}

/**
 * Setup helper that combines dismissing modal and waiting for app
 * Use this in test.beforeEach() for most tests
 */
export async function setupTest(page: Page, url: string = '/'): Promise<void> {
  await setupSupabaseMocks(page);
  await page.goto(url);
  await waitForAppReady(page);
  await dismissWelcomeModal(page);
}

/**
 * Clicks an element with retry logic to handle modals and animations
 */
export async function clickWithRetry(
  page: Page,
  selector: string,
  maxRetries: number = 3
): Promise<void> {
  let lastError: Error | undefined;

  for (let i = 0; i < maxRetries; i++) {
    try {
      const element = page.locator(selector).first();
      await element.click({ timeout: 5000 });
      return;
    } catch (error) {
      lastError = error as Error;

      // If modal is blocking, try to dismiss it
      await dismissWelcomeModal(page);
      await page.waitForTimeout(500);
    }
  }

  throw lastError || new Error(`Could not click ${selector} after ${maxRetries} retries`);
}

/**
 * Starts a quiz from the homepage
 * Handles topic expansion and level selection
 */
export async function startQuiz(
  page: Page,
  topicName: string = 'Integers',
  level: number = 1
): Promise<void> {
  // Prefer the specific data-testid level button on the topic card
  const levelBtn = page.locator(`[data-testid="level-button-${level}"]`).first();
  if (await levelBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await levelBtn.click();
    await page.waitForTimeout(1500);
    return;
  }

  // Fallback: click topic name (starts quiz at the first un-mastered level)
  const topicLocator = page.locator(`text=${topicName}`).first();
  await topicLocator.click();
  await page.waitForTimeout(1500);
}

/**
 * Checks if an element is visible, with auto-wait (up to 3s)
 */
export async function isVisible(page: Page, selector: string): Promise<boolean> {
  try {
    await page.locator(selector).first().waitFor({ state: 'visible', timeout: 3000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Gets text content safely
 */
export async function getTextSafe(page: Page, selector: string): Promise<string> {
  return await page.locator(selector).textContent().catch(() => '') || '';
}
