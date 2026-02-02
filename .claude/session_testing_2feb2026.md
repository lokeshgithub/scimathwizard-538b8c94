# Testing Session - February 2, 2026

## WHERE WE LEFT OFF

**Last Action:** Started adding `data-testid` attributes to QuizCard.tsx
**Decision Pending:** Choose between Option A (fix locators only) or Option B (add testids + fix tests)
**Immediate Next Step:** Run `npm run test:e2e:ui` and fix E2E test locators

**Uncommitted Changes:**
- `src/components/quiz/QuizCard.tsx` - Added data-testid attributes (partial)
- `src/components/quiz/TopicDashboard.tsx` - Simplified categorization (staged)
- `src/pages/Index.tsx` - Fixed useMemo import + sync improvements

---

## Session Summary

This session focused on setting up comprehensive automated and manual testing for SciMathWizard (Magic Mastery Quiz), an educational platform for ICSE students (Class 7-12) in India.

---

## What Was Accomplished

### 1. Bug Fix: Missing `useMemo` Import
- **File:** `src/pages/Index.tsx:1`
- **Issue:** App showed blank screen due to `useMemo` being used but not imported
- **Fix:** Added `useMemo` to React imports
- **Status:** FIXED

### 2. Unit Tests Created (Vitest)
All 350 tests passing.

| Test File | Tests | Coverage |
|-----------|-------|----------|
| `src/test/QuizCard.test.tsx` | 70 | Question display, answers, timer, hints, explanations |
| `src/test/TopicDashboard.test.tsx` | 63 | Categories, progress, levels, search, guest limits |
| `src/test/masteryRewards.test.ts` | 52 | Star calculations, streak bonuses, anti-grinding |
| `src/test/sessionPersistence.test.ts` | 35 | localStorage, session recovery, star sync |
| `src/test/hints.test.ts` | 32 | Hint parsing, progressive reveal |
| `src/test/starShop.test.ts` | 24 | Purchase flow, requirements |
| `src/test/topicCategorization.test.ts` | 50 | Topic to category mapping |
| `src/test/useQuizStore.test.ts` | 21 | Core quiz state management |
| `src/test/testLevelParsing.test.ts` | 2 | Level parsing |
| `src/test/example.test.ts` | 1 | Basic sanity |

**Run:** `npm run test`

### 3. E2E Tests Created (Playwright)
Framework set up with 78 tests across 6 files. Tests need locator adjustments.

| Test File | Tests | Coverage |
|-----------|-------|----------|
| `e2e/quiz-flow.spec.ts` | 16 | Core quiz experience, navigation, stars |
| `e2e/topic-navigation.spec.ts` | 15 | Dashboard, subject tabs, level selection |
| `e2e/hints-and-help.spec.ts` | 12 | Hint system, explanations, session summary |
| `e2e/mobile-tablet.spec.ts` | 20 | Responsive design, touch, breakpoints |
| `e2e/performance.spec.ts` | 12 | Load times, animations, network |
| `e2e/accessibility.spec.ts` | 16 | Keyboard nav, screen readers, focus |

**Run:** `npm run test:e2e`

### 4. Test Agent Created
- **File:** `.claude/test-agent.md`
- Specialized testing expert persona for educational apps
- Includes templates for automated and manual tests
- Focus on ICSE students, Indian network conditions

### 5. Manual Test Cases Document
- **File:** `src/test/MANUAL_TEST_CASES.md`
- 15+ critical test cases (TC-001 to TC-015)
- Device matrix (budget Android to iPad)
- Network condition testing guide
- Pre-release checklist

---

## Current State

### Working
- Dev server: `npm run dev` (runs on port 8081)
- Unit tests: `npm run test` (350 tests, all passing)
- Build: `npm run build` (successful)
- Playwright installed with Chrome

### Pending
- E2E tests need locator adjustments to match actual UI elements
- Some E2E tests timeout due to incorrect selectors

### Staged Changes (Uncommitted)
```
M  src/components/quiz/TopicDashboard.tsx  (simplified categorization)
```

---

## How to Resume

### 1. Start Dev Server
```bash
cd /Users/lokesh/Documents-Local/JainiLearning_v2/github_repos_scimathwizard/scimathwizard-538b8c94
npm run dev
```
App runs at: http://localhost:8081/

### 2. Run Unit Tests
```bash
npm run test           # All 350 tests
npm run test:watch     # Watch mode
```

### 3. Run E2E Tests
```bash
npm run test:e2e:ui      # Interactive mode (recommended for debugging)
npm run test:e2e:headed  # See browser while tests run
npm run test:e2e:chrome  # Desktop Chrome only
```

### 4. Fix E2E Locators
To fix failing E2E tests:
1. Run `npm run test:e2e:ui` to open Playwright UI
2. Use "Pick locator" to find correct selectors
3. Update test files in `e2e/` directory
4. Add `data-testid` attributes to components if needed

---

## File Structure for Tests

```
scimathwizard-538b8c94/
├── src/test/                    # Unit tests (Vitest)
│   ├── QuizCard.test.tsx
│   ├── TopicDashboard.test.tsx
│   ├── masteryRewards.test.ts
│   ├── sessionPersistence.test.ts
│   ├── hints.test.ts
│   ├── starShop.test.ts
│   ├── topicCategorization.test.ts
│   ├── useQuizStore.test.ts
│   └── MANUAL_TEST_CASES.md     # Manual test documentation
├── e2e/                         # E2E tests (Playwright)
│   ├── quiz-flow.spec.ts
│   ├── topic-navigation.spec.ts
│   ├── hints-and-help.spec.ts
│   ├── mobile-tablet.spec.ts
│   ├── performance.spec.ts
│   └── accessibility.spec.ts
├── playwright.config.ts         # Playwright configuration
└── .claude/
    ├── test-agent.md            # Test agent persona
    ├── experts.md               # Review expert personas
    └── session_testing_2feb2026.md  # This file
```

---

## NPM Scripts Reference

```bash
# Development
npm run dev              # Start dev server

# Unit Tests
npm run test             # Run all unit tests
npm run test:watch       # Watch mode

# E2E Tests
npm run test:e2e         # Run all E2E tests (all devices)
npm run test:e2e:ui      # Interactive UI mode
npm run test:e2e:headed  # See browser while running
npm run test:e2e:chrome  # Desktop Chrome only
npm run test:e2e:ipad    # iPad only
npm run test:e2e:mobile  # iPhone only
npm run test:e2e:report  # View HTML report

# Combined
npm run test:all         # Unit + E2E tests
```

---

## Next Steps (Recommended)

### PRIORITY 1: Fix E2E Test Locators

**Problem:** E2E tests fail because locators don't match actual UI elements.

**Two Options:**
- **Option A (Faster):** Update test locators to match current UI
- **Option B (More Maintainable):** Add `data-testid` to components AND update tests

**Recommended Approach:**
1. Run `npm run test:e2e:ui` to open Playwright's visual debugger
2. Use "Pick locator" feature to find correct selectors for each element
3. Update the 6 E2E test files in `e2e/` directory with correct locators
4. Only add `data-testid` where locators are truly fragile

**Partially Done:**
- Added `data-testid="quiz-card"` to QuizCard container
- Added `data-testid="question-text"` to question paragraph
- Added `data-testid="answer-option-a/b/c/d"` to answer buttons
- Added `data-testid="hint-button"` to hint button
- Still need: TopicDashboard, navigation buttons, level buttons, etc.

**Key Files to Update:**
```
e2e/quiz-flow.spec.ts        - Update answer button locators
e2e/topic-navigation.spec.ts - Update topic/level selectors
e2e/hints-and-help.spec.ts   - Update hint button locators
e2e/mobile-tablet.spec.ts    - Update responsive test locators
e2e/performance.spec.ts      - Should mostly work
e2e/accessibility.spec.ts    - Update focus/keyboard locators
```

### PRIORITY 2: Commit Test Infrastructure
```bash
git add src/test/ e2e/ playwright.config.ts package.json .claude/
git commit -m "Add comprehensive test suites (unit + E2E)"
```

### PRIORITY 3: Run Manual Tests
- Follow `src/test/MANUAL_TEST_CASES.md`
- Test on real devices (budget Android, iPad)

### PRIORITY 4: Add CI/CD
- Add GitHub Actions for automated testing
- Run tests on PR

---

## Context for Claude

When resuming:
- **Test Agent:** Use `.claude/test-agent.md` for creating new tests
- **Expert Review:** Use `.claude/experts.md` for code review
- **Unit tests location:** `src/test/`
- **E2E tests location:** `e2e/`
- **Manual tests:** `src/test/MANUAL_TEST_CASES.md`

The app is an educational quiz platform for Indian ICSE students. Focus on:
- Mobile-first (budget Android is primary)
- Network resilience (2G to 4G)
- Touch-friendly UI (48px+ targets)
- Gamification (stars, streaks, achievements)
- FREE hints for struggling students
