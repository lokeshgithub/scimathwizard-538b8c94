# E2E Tests - SciMathWizard

End-to-end browser tests using Playwright for the Magic Mastery Quiz application.

## Quick Start

```bash
# Run all E2E tests
npm run test:e2e

# Run with visual UI (recommended for debugging)
npm run test:e2e:ui

# Run and see browser
npm run test:e2e:headed

# Run specific device
npm run test:e2e:chrome   # Desktop Chrome
npm run test:e2e:ipad     # iPad Pro
npm run test:e2e:mobile   # iPhone 14
```

---

## Test Files

| File | Description | Test Count |
|------|-------------|------------|
| `quiz-flow.spec.ts` | Core quiz experience - answering, feedback, navigation | 16 |
| `topic-navigation.spec.ts` | Dashboard, topics, levels, subject switching | 15 |
| `hints-and-help.spec.ts` | Hint system (FREE), explanations, session summary | 12 |
| `mobile-tablet.spec.ts` | Responsive design, touch targets, breakpoints | 20 |
| `performance.spec.ts` | Load times, animations, network resilience | 12 |
| `accessibility.spec.ts` | Keyboard navigation, screen readers, focus | 16 |

**Total: 78 E2E tests**

---

## Device Profiles

Tests run on these simulated devices (configured in `playwright.config.ts`):

| Profile | Viewport | Use Case |
|---------|----------|----------|
| Desktop Chrome | 1440x900 | Primary testing |
| MacBook Pro | 1512x982 @2x | Retina display |
| Windows Laptop | 1366x768 | Common student laptop |
| iPad Pro | 1024x1366 | Tablet experience |
| iPad Mini | 768x1024 | Smaller tablet |
| Galaxy Tab S4 | 712x1138 | Android tablet |
| iPhone 14 | 390x844 | Mobile experience |
| Pixel 5 | 393x851 | Android phone |

---

## Test Categories

### 1. Quiz Flow (`quiz-flow.spec.ts`)

Tests the core student experience:
- Dashboard loads correctly
- Topic selection and expansion
- Level selection
- Question display with 4 options
- Answer feedback (green/red)
- Next button after answering
- Star rewards
- Exit confirmation

### 2. Topic Navigation (`topic-navigation.spec.ts`)

Tests the dashboard experience:
- Math/Physics/Chemistry tabs
- Topic categories (Numbers, Algebra, Geometry, etc.)
- Progress indicators
- Level locking/unlocking
- Search functionality
- Mixed mode

### 3. Hints & Help (`hints-and-help.spec.ts`)

Tests the support system:
- Hint button visibility (Level 4+)
- FREE hints (no star cost)
- Progressive hint reveal
- Explanation display
- Session summary/reports

### 4. Mobile & Tablet (`mobile-tablet.spec.ts`)

Tests responsive design:
- No horizontal scroll
- Touch-friendly buttons (44px+)
- Compact header in quiz mode
- Responsive breakpoints (320px to 1440px)
- Visual consistency

### 5. Performance (`performance.spec.ts`)

Tests speed and resilience:
- Dashboard loads in <3 seconds
- Content above fold immediately
- Smooth animations
- Reduced motion support
- Network failure handling
- Memory leak prevention

### 6. Accessibility (`accessibility.spec.ts`)

Tests inclusivity:
- Keyboard navigation (Tab, Enter, Escape)
- Heading hierarchy (h1, h2, etc.)
- ARIA labels on buttons
- Alt text on images
- Color contrast
- Focus indicators
- Focus trapping in modals

---

## Running Tests

### All Tests (All Devices)
```bash
npm run test:e2e
```

### Interactive UI Mode (Best for Debugging)
```bash
npm run test:e2e:ui
```
Opens Playwright's visual debugger where you can:
- See tests run in real-time
- Step through tests
- Pick locators
- Debug failures

### Headed Mode (See Browser)
```bash
npm run test:e2e:headed
```

### Single Device
```bash
npm run test:e2e:chrome    # Desktop Chrome
npm run test:e2e:ipad      # iPad Pro
npm run test:e2e:mobile    # iPhone 14
```

### Specific Test File
```bash
npx playwright test e2e/quiz-flow.spec.ts
```

### Specific Test
```bash
npx playwright test -g "should display question"
```

### View Report
```bash
npm run test:e2e:report
```
Opens HTML report with screenshots and traces.

---

## Writing New Tests

### Basic Test Structure
```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);
  });

  test('should do something', async ({ page }) => {
    // Arrange
    const element = page.locator('text=Something');

    // Act
    await element.click();

    // Assert
    await expect(page.locator('text=Result')).toBeVisible();
  });
});
```

### Recommended Locators (in order of preference)
1. `data-testid` - Most reliable
2. Role + name - `page.getByRole('button', { name: 'Start' })`
3. Text - `page.locator('text=Level 1')`
4. CSS class - `page.locator('.quiz-card')` (fragile)

### Adding data-testid to Components
```tsx
// In component:
<button data-testid="start-quiz-btn">Start Quiz</button>

// In test:
await page.locator('[data-testid="start-quiz-btn"]').click();
```

---

## Troubleshooting

### Tests Timing Out
- Increase timeout: `test.setTimeout(60000)`
- Add explicit waits: `await page.waitForTimeout(1000)`
- Check if element exists: `await element.isVisible()`

### Element Not Found
1. Run `npm run test:e2e:ui` to see what's rendered
2. Use "Pick locator" to find correct selector
3. Check if element is in viewport

### Flaky Tests
- Add retry: `test.describe.configure({ retries: 2 })`
- Use `waitFor`: `await element.waitFor({ state: 'visible' })`
- Avoid timing-dependent assertions

### Screenshots
Screenshots are saved on failure to `playwright-report/`.

---

## CI/CD Integration

### GitHub Actions Example
```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run test:e2e:chrome
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

---

## Key Metrics to Watch

| Metric | Target | Current |
|--------|--------|---------|
| Dashboard Load | <3s | ~1.8s |
| First Input Delay | <100ms | TBD |
| Largest Contentful Paint | <2.5s | ~1.5s |
| Test Pass Rate | 100% | Needs locator fixes |

---

## Known Issues

1. **Locator Adjustments Needed**
   - Many tests use generic locators that need to be updated to match actual UI
   - Use `npm run test:e2e:ui` to find correct selectors

2. **Timeouts on Quiz Flow**
   - Some quiz flow tests timeout because topic/level buttons aren't found
   - Need to add `data-testid` attributes to key components

3. **Mobile Tests Need Real Device Testing**
   - Playwright simulates mobile but real devices may behave differently
   - Manual testing on actual devices recommended

---

## Contributing

When adding new E2E tests:
1. Follow existing patterns
2. Use descriptive test names
3. Add to appropriate spec file
4. Test on multiple devices
5. Document any new patterns
