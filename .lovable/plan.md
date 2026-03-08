

## Comprehensive Bug Audit: Threshold & UX Consistency Issues

After a thorough review of the codebase, I found **5 bugs** — a mix of logic mismatches, stale defaults, and a React warning. Here's what needs fixing:

---

### Bug 1: MasteryPanel uses stale `threshold` prop (default 0.9)

**File:** `src/components/quiz/MasteryPanel.tsx` (line 71, 80, 226)

The `threshold` prop defaults to `0.9` and is used to calculate `requiredCorrect` and display the progress text. While `FocusedPractice.tsx` passes `quiz.THRESHOLD` (which is dynamic), the calculation is still wrong because `threshold` is a single number for the **current** level, but the panel also displays per-level badges using `getThresholdForLevel(level)` — so there's an inconsistency: the badge shows the correct per-level threshold, but the progress bar and "X/Y needed (Z%)" text uses the single passed-in threshold.

**Fix:** Remove the `threshold` prop entirely. Instead, compute it inside the component using `getThresholdForLevel(currentLevel)` directly.

---

### Bug 2: MasteryPanel progress bar calculates against wrong denominator

**File:** `src/components/quiz/MasteryPanel.tsx` (line 80-83)

```typescript
const requiredCorrect = Math.ceil(threshold * perLevel);
const progressPercent = levelStats.correct / requiredCorrect * 100;
```

This shows progress toward "required correct answers" but `levelStats.total` might be less than `perLevel`. A student who got 8/8 correct sees 89% progress toward the 9 needed (for 90% threshold), which is confusing. The progress bar should show progress toward completion (total answered / perLevel), not correct/required.

**Fix:** Show `levelStats.total / perLevel` as the progress bar fill, with a secondary indicator for accuracy.

---

### Bug 3: SignUpPrompt missing `forwardRef` (React warning)

**File:** `src/components/quiz/SignUpPrompt.tsx` (line 12)

Console shows: "Function components cannot be given refs. Check the render method of TopicDashboard." The `SignUpPrompt` component is being passed a ref but doesn't use `React.forwardRef`.

**Fix:** Wrap with `React.forwardRef` or remove the ref from where it's rendered in `TopicDashboard`.

---

### Bug 4: Legacy `THRESHOLD = 0.9` constant still exists

**File:** `src/hooks/useQuizStore.ts` (line 54)

```typescript
const THRESHOLD = 0.9; // Legacy default, use getThresholdForLevel() instead
```

While the exported `THRESHOLD` on line 1542 correctly uses `getThresholdForLevel(level)`, the constant at line 54 is confusing and could be accidentally used. It should be removed entirely to prevent future misuse.

**Fix:** Delete the unused constant.

---

### Bug 5: AlertDialog ref warning in TopicDashboard

**File:** `src/components/quiz/TopicDashboard.tsx`

Console shows a second ref warning for `AlertDialog`. This is likely from rendering `AlertDialog` without proper wrapping.

**Fix:** Review how `AlertDialog` is rendered in TopicDashboard and ensure it's not receiving a forwarded ref incorrectly.

---

### Implementation Plan

1. **Fix MasteryPanel** — Remove `threshold` prop, use `getThresholdForLevel(currentLevel)` internally. Fix progress bar to show total progress, not just correct/required.

2. **Fix SignUpPrompt** — Add `React.forwardRef` or remove ref usage in TopicDashboard.

3. **Fix AlertDialog ref warning** — Review TopicDashboard rendering.

4. **Remove legacy THRESHOLD constant** — Clean up `useQuizStore.ts` line 54.

5. **Update FocusedPractice.tsx** — Remove `threshold` prop from MasteryPanel usage since it will compute internally.

6. **Run all tests** to verify nothing breaks.

### Files to modify:
- `src/components/quiz/MasteryPanel.tsx`
- `src/components/quiz/SignUpPrompt.tsx`
- `src/components/quiz/TopicDashboard.tsx`
- `src/hooks/useQuizStore.ts`
- `src/pages/FocusedPractice.tsx`

