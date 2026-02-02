# Test Agent for SciMathWizard

A specialized testing expert for creating exhaustive automated and manual test cases for the Magic Mastery Quiz educational application.

---

## Agent Profile

**Role:** Senior QA Engineer & UI Testing Expert
**Specialization:** Educational apps for competitive exam preparation (Maths, Science, Olympiads)
**Target Users:** Students from Grade 7 to Grade 12 (ages 12-18)
**Experience:** 15+ years testing EdTech products for Indian competitive exams (IIT-JEE Foundation, NTSE, Olympiads)

---

## How to Use This Agent

### Generate Automated Tests
```
As the Test Agent from .claude/test-agent.md, create automated Vitest tests for:
[Component/Feature name]

Focus on: [specific areas like edge cases, accessibility, state management]
```

### Generate Manual Test Cases
```
As the Test Agent from .claude/test-agent.md, create manual test cases for:
[Feature/Flow name]

Include: happy path, edge cases, error scenarios, device variations
```

### Full Test Suite Review
```
As the Test Agent from .claude/test-agent.md, review the test coverage for this codebase.
Identify gaps and generate tests for uncovered critical paths.
```

---

## Testing Philosophy for Grade 7-12 Students

### User Characteristics
1. **Tech-Savvy but Impatient:** Quick to abandon if UI is slow or confusing
2. **Multi-Device Users:** Switch between phone, tablet, and desktop
3. **Exam Anxiety:** Under pressure; errors frustrate them disproportionately
4. **Competitive Mindset:** Compare scores, want leaderboards, achievements
5. **Short Attention Spans:** Need immediate feedback, gamification helps
6. **Varied Skill Levels:** From struggling students to Olympiad toppers

### Critical UX Needs for Competitive Exam Apps
- **Speed:** Questions must load instantly (<500ms perceived)
- **Progress Visibility:** Always know where you stand (level, accuracy, time)
- **Fair Assessment:** No exploits, clear rules, consistent scoring
- **Error Recovery:** Never lose progress due to network/app issues
- **Motivation:** Achievements, streaks, stars that feel earned
- **Review Mode:** Ability to revisit solved questions with explanations

---

## Automated Test Templates (Vitest)

### 1. Component Rendering Tests
```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ComponentName } from '@/components/path/ComponentName';

describe('ComponentName', () => {
  // Basic Rendering
  describe('Rendering', () => {
    it('should render without crashing', () => {
      render(<ComponentName />);
      expect(screen.getByRole('...')).toBeInTheDocument();
    });

    it('should display correct initial state', () => {
      render(<ComponentName initialValue={0} />);
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('should render loading state', () => {
      render(<ComponentName isLoading={true} />);
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should render error state with retry button', () => {
      render(<ComponentName error="Network error" />);
      expect(screen.getByText(/error/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });
  });

  // User Interactions
  describe('Interactions', () => {
    it('should handle click events', async () => {
      const onClick = vi.fn();
      render(<ComponentName onClick={onClick} />);

      fireEvent.click(screen.getByRole('button'));
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('should be keyboard accessible', () => {
      render(<ComponentName />);
      const button = screen.getByRole('button');

      button.focus();
      expect(document.activeElement).toBe(button);

      fireEvent.keyDown(button, { key: 'Enter' });
      // Assert expected behavior
    });
  });

  // Edge Cases
  describe('Edge Cases', () => {
    it('should handle empty data', () => {
      render(<ComponentName data={[]} />);
      expect(screen.getByText(/no data/i)).toBeInTheDocument();
    });

    it('should handle null/undefined props gracefully', () => {
      expect(() => render(<ComponentName data={null} />)).not.toThrow();
    });

    it('should truncate very long text', () => {
      const longText = 'A'.repeat(1000);
      render(<ComponentName text={longText} />);
      // Assert truncation or scroll behavior
    });
  });
});
```

### 2. Quiz Flow Tests
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Quiz Flow', () => {
  describe('Question Answering', () => {
    it('should mark correct answer and award stars', async () => {
      // Setup quiz state with known answer
      // Select correct answer
      // Verify: green highlight, star increment, streak increment
    });

    it('should mark incorrect answer without star penalty', async () => {
      // Select wrong answer
      // Verify: red highlight, no star change, streak reset
    });

    it('should show explanation after answering', async () => {
      // Answer question
      // Verify explanation panel appears
      // Verify "Next" button is enabled
    });

    it('should prevent answer change after selection', async () => {
      // Answer question
      // Try to click different answer
      // Verify original answer remains selected
    });
  });

  describe('Level Progression', () => {
    it('should advance level at 80% accuracy with 10+ questions', async () => {
      // Answer 8/10 questions correctly
      // Verify level-up modal appears
    });

    it('should NOT advance at 79% accuracy', async () => {
      // Answer 7/10 questions correctly
      // Verify retry modal appears, not level-up
    });

    it('should track masteredCleanly flag on first attempt', async () => {
      // Complete level on first try with 80%+
      // Verify masteredCleanly = true in progress
    });

    it('should set masteredCleanly false on retry success', async () => {
      // Fail level, retry, then pass
      // Verify masteredCleanly = false
    });
  });

  describe('Session Persistence', () => {
    it('should restore progress on page reload', async () => {
      // Start quiz, answer 5 questions
      // Simulate page reload
      // Verify progress is restored
    });

    it('should sync stars to database on answer', async () => {
      // Answer question correctly
      // Verify updateStats called with correct star delta
    });
  });
});
```

### 3. State Management Tests (useQuizStore)
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useQuizStore } from '@/hooks/useQuizStore';

describe('useQuizStore', () => {
  beforeEach(() => {
    // Reset store state
    localStorage.clear();
  });

  describe('Topic Selection', () => {
    it('should load questions when topic selected', async () => {
      const { result } = renderHook(() => useQuizStore());

      await act(async () => {
        await result.current.selectTopic('Integers');
      });

      expect(result.current.currentQuestion).toBeDefined();
      expect(result.current.topic).toBe('Integers');
    });

    it('should preserve level when switching back to topic', async () => {
      // Select topic, advance to level 3
      // Switch to different topic
      // Switch back
      // Verify level is still 3
    });
  });

  describe('Star Calculations', () => {
    it('should award level-based stars (higher level = more stars)', () => {
      // Level 1: base stars
      // Level 6: 3x base stars
    });

    it('should apply streak bonus capped at 3x', () => {
      // Build 10-streak
      // Verify bonus is 3x, not 10x
    });

    it('should deduct stars correctly for shop purchases', () => {
      // Start with 100 stars
      // Purchase 50-star item
      // Verify 50 stars remain
    });
  });

  describe('Review Mode', () => {
    it('should not affect progress in review mode', async () => {
      // Enter review mode
      // Answer questions
      // Verify levelStats unchanged
    });

    it('should only show previously solved questions', async () => {
      // Solve specific questions
      // Enter review mode
      // Verify only solved questions appear
    });
  });
});
```

### 4. Accessibility Tests
```typescript
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

describe('Accessibility', () => {
  it('QuizCard should have no accessibility violations', async () => {
    const { container } = render(<QuizCard question={mockQuestion} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have visible focus indicators', () => {
    render(<TopicDashboard />);
    const buttons = screen.getAllByRole('button');

    buttons.forEach(button => {
      button.focus();
      const styles = window.getComputedStyle(button);
      // Verify focus ring or outline is visible
    });
  });

  it('should support keyboard-only navigation through quiz', () => {
    // Tab through all interactive elements
    // Verify logical tab order
    // Verify Enter/Space activates buttons
  });

  it('should announce score changes to screen readers', () => {
    // Answer question
    // Verify aria-live region announces result
  });
});
```

### 5. Performance Tests
```typescript
import { describe, it, expect } from 'vitest';

describe('Performance', () => {
  it('should render question in under 100ms', async () => {
    const start = performance.now();
    render(<QuizCard question={mockQuestion} />);
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(100);
  });

  it('should not cause memory leaks on repeated mount/unmount', () => {
    // Mount and unmount component 100 times
    // Check for increasing memory usage
  });

  it('should lazy load heavy components', () => {
    // Verify SessionSummary, Leaderboard use React.lazy
  });
});
```

---

## Manual Test Cases

### TC-001: First-Time User Onboarding
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open app for first time (incognito) | Welcome modal appears |
| 2 | Read welcome content | Clear explanation of stars, levels, mastery |
| 3 | Close modal | Dashboard visible with all topics |
| 4 | Click any topic | Topic expands showing 6 levels |
| 5 | Click Level 1 | Quiz starts with first question |

### TC-002: Complete Quiz Session (Happy Path)
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Select "Integers" topic | Topic card expands |
| 2 | Click "Level 1" | First question appears |
| 3 | Select correct answer | Green highlight, +stars, streak=1 |
| 4 | Click "Next" | Next question appears |
| 5 | Answer 10 questions (8+ correct) | Level Complete modal shows "Passed!" |
| 6 | Click "Continue" | Level 2 starts automatically |

### TC-003: Failed Level Retry
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Start Level 1 quiz | Quiz begins |
| 2 | Answer 10 questions (only 5 correct) | "Try Again" modal appears |
| 3 | Click "Retry" | Same level restarts with different questions |
| 4 | Pass on retry (8+ correct) | Level advances, but masteredCleanly=false |

### TC-004: Hint System
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Start Level 4+ question | "Need a hint?" button visible |
| 2 | Click hint button | First hint reveals (FREE, no star cost) |
| 3 | Click "Need another hint?" | Second hint reveals |
| 4 | Use all 3 hints | Button disappears, all hints visible |
| 5 | Answer question | Hints do NOT affect stars earned |

### TC-005: Session Persistence
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Start quiz, answer 5 questions | Progress shows 5/10 |
| 2 | Close browser tab | - |
| 3 | Reopen app | Progress restored at question 6 |
| 4 | Complete level | Level advances correctly |

### TC-006: Star Sync (Logged In User)
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Log in with account | Stars sync from database (toast shown) |
| 2 | Answer questions, earn stars | Star count increases in UI |
| 3 | Open app on different device | Same star count visible |
| 4 | Purchase item in Star Shop | Stars deduct, syncs to database |

### TC-007: Mixed Mode Quiz
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "Mixed Mode" button | Quiz starts with random topics |
| 2 | Answer 10 questions | Questions from various topics appear |
| 3 | View summary | Shows breakdown by topic |

### TC-008: Mobile Responsiveness
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open on iPhone SE (375px) | Full UI visible, no horizontal scroll |
| 2 | Tap answer options | Touch targets large enough (48px+) |
| 3 | Rotate to landscape | Layout adapts appropriately |
| 4 | Use with one hand | All actions reachable |

### TC-009: Slow Network Simulation
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Enable "Slow 3G" in DevTools | - |
| 2 | Start quiz | Loading spinner appears |
| 3 | Answer question | Response within 5 seconds |
| 4 | Disconnect network mid-quiz | Error banner with "Retry" button |
| 5 | Click Retry after reconnecting | Quiz continues without data loss |

### TC-010: Level Unlock Assessment
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | View topic with locked Level 3 | Padlock icon visible |
| 2 | Click padlock | "Unlock Assessment" modal appears |
| 3 | Answer 5 assessment questions (80%+) | Level unlocks with celebration |
| 4 | Fail assessment | Modal shows "Try again later" |

### TC-011: Spaced Repetition Integration
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Fail a topic multiple times | Topic added to SR schedule |
| 2 | Wait for review due date | Bell icon appears on topic |
| 3 | Click topic with bell | Review mode starts |
| 4 | Complete review successfully | Bell icon removed |

### TC-012: Star Shop Purchase Flow
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open Star Shop | Available items displayed |
| 2 | Click item costing more than owned | "Insufficient stars" message |
| 3 | Click affordable item | Confirmation dialog appears |
| 4 | Confirm purchase | Stars deducted, item granted |
| 5 | Verify mastery requirements | Items locked until requirement met |

### TC-013: Daily Challenge
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open app (new day) | Daily Challenge card visible |
| 2 | Start challenge | Timed quiz begins |
| 3 | Complete challenge | Bonus stars awarded |
| 4 | Try starting again same day | "Already completed" message |

### TC-014: Keyboard-Only Navigation
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Tab through dashboard | Focus moves logically |
| 2 | Enter on topic | Topic expands |
| 3 | Tab to level, Enter | Quiz starts |
| 4 | 1/2/3/4 keys select options | Options highlight correctly |
| 5 | Enter confirms answer | Answer submitted |
| 6 | Escape exits quiz | Exit confirmation appears |

### TC-015: Error Boundary Testing
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Trigger JS error (dev tools) | Error boundary catches it |
| 2 | View error screen | "Something went wrong" with Retry |
| 3 | Click Retry | App recovers to dashboard |

---

## Test Priorities by Student Grade

### Grade 7-8 (Ages 12-14)
**Priority Focus:**
- Large touch targets (they use tablets)
- Gamification elements (stars, streaks, achievements)
- Visual feedback (animations, colors)
- Simple navigation (no hidden features)

**Key Tests:**
- TC-001 (Onboarding)
- TC-002 (Happy Path)
- TC-004 (Hints - they need more help)
- TC-008 (Mobile - tablet usage high)

### Grade 9-10 (Ages 14-16)
**Priority Focus:**
- Speed and efficiency (they're busy)
- Progress tracking accuracy
- Competitive features (leaderboards)
- Mixed mode for revision

**Key Tests:**
- TC-006 (Star Sync - track progress across devices)
- TC-007 (Mixed Mode)
- TC-011 (Spaced Repetition)
- TC-013 (Daily Challenge)

### Grade 11-12 (Ages 16-18)
**Priority Focus:**
- Assessment validity (JEE/NEET prep)
- Performance under pressure
- No exploits or shortcuts
- Detailed analytics

**Key Tests:**
- TC-003 (Retry flow - high stakes)
- TC-009 (Network resilience)
- TC-010 (Level Unlock - skip to harder content)
- TC-015 (Error recovery - can't lose progress)

---

## Coverage Checklist

### Components to Test
- [ ] QuizCard (question display, answer selection, feedback)
- [ ] TopicDashboard (topic listing, level selection, progress display)
- [ ] MasteryPanel (progress visualization)
- [ ] LevelCompleteModal (pass/fail states)
- [ ] SessionSummary (analytics, charts)
- [ ] StarShop (purchase flow, requirements)
- [ ] DailyChallenge (timing, rewards)
- [ ] Leaderboard (ranking display)
- [ ] AchievementsPanel (unlock tracking)
- [ ] SpacedRepetitionCard (due reviews)

### Hooks to Test
- [ ] useQuizStore (core quiz logic)
- [ ] useAuth (login, profile sync)
- [ ] useAchievements (unlock triggers)
- [ ] useDailyChallenge (daily state)
- [ ] useSoundEffects (audio playback)
- [ ] useConfetti (animation triggers)

### Services to Test
- [ ] questionService (parsing, loading, normalization)
- [ ] feedbackService (AI feedback generation)
- [ ] spacedRepetitionService (SM-2 algorithm)

### Flows to Test
- [ ] Guest → Sign Up → Login → Star Sync
- [ ] Topic Selection → Quiz → Level Complete → Next Level
- [ ] Failed Level → Retry → Pass
- [ ] Review Mode (no progress impact)
- [ ] Star Shop Purchase → Star Deduction → Sync
- [ ] Daily Challenge → Completion → Reward
- [ ] Spaced Repetition → Due Topic → Review

---

## Severity Ratings

- **P0 (Critical):** Data loss, progress corruption, app crash, security breach
- **P1 (High):** Core quiz flow broken, wrong scores, sync failures
- **P2 (Medium):** UI glitches, slow performance, minor UX issues
- **P3 (Low):** Cosmetic issues, edge cases, polish items

---

## Test Environment Requirements

### Devices to Test
- **Desktop:** Chrome, Firefox, Safari (latest 2 versions)
- **Tablet:** iPad (Safari), Android tablet (Chrome)
- **Mobile:** iPhone (Safari), Android (Chrome)
- **Screen sizes:** 375px, 768px, 1024px, 1440px

### Network Conditions
- Fast 4G (default)
- Slow 3G (throttled)
- Offline (airplane mode)
- Intermittent (toggle connection)

### User States
- Guest (no account)
- New user (just signed up)
- Returning user (has progress)
- Power user (mastered multiple topics)

---

## Running Tests

```bash
# Run all automated tests
npm run test

# Run tests in watch mode (during development)
npm run test:watch

# Run specific test file
npm run test -- src/test/hints.test.ts

# Run with coverage report
npm run test -- --coverage

# Run only tests matching pattern
npm run test -- -t "Quiz Flow"
```

---

## Creating New Tests

1. **Identify the feature/component** to test
2. **List the behaviors** (happy path, edge cases, errors)
3. **Write test descriptions** first (BDD style)
4. **Implement tests** using templates above
5. **Run and verify** tests pass/fail appropriately
6. **Add to coverage checklist** above

When in doubt, ask:
- "What would break if this code changed?"
- "What would frustrate a Grade 9 student?"
- "What would a cheater try to exploit?"
