# Manual Test Cases - SciMathWizard (Magic Mastery Quiz)

## Target Audience
- **Primary:** ICSE students from Class 7 to Class 12 (ages 12-18)
- **Subjects:** Mathematics, Physics, Chemistry
- **Region:** India (varied connectivity, budget to premium devices)

---

## Test Environment Matrix

### Devices to Test
| Device Type | Examples | Priority |
|-------------|----------|----------|
| Budget Android (2GB RAM) | Redmi 9A, Samsung A03 | P0 (Most common in India) |
| Mid-range Android | OnePlus Nord, Samsung A53 | P0 |
| Premium Android | Samsung S23, OnePlus 11 | P1 |
| iPhone SE | iPhone SE 2022 | P1 |
| iPhone (Standard) | iPhone 13/14/15 | P1 |
| iPad | iPad 9th gen, iPad Air | P1 |
| Desktop Chrome | Windows 10/11, macOS | P1 |
| Desktop Firefox | Windows 10/11 | P2 |
| Desktop Safari | macOS | P2 |

### Network Conditions
| Condition | Simulation | Priority |
|-----------|------------|----------|
| Fast 4G/WiFi | Default | P0 |
| Slow 3G | DevTools throttle | P0 |
| 2G | DevTools throttle | P1 |
| Offline | Airplane mode | P1 |
| Intermittent | Toggle WiFi | P1 |

### User States
| State | Description | Priority |
|-------|-------------|----------|
| Guest (New) | First-time visitor | P0 |
| Guest (Used limit) | Accessed 3 topics | P0 |
| Logged In (New) | Fresh account | P0 |
| Logged In (Progress) | Has mastered levels | P0 |
| Logged In (Power User) | Multiple topics mastered | P1 |

---

## Critical User Journeys

### TC-001: First-Time User Complete Flow

**Priority:** P0 - Critical
**Grade Focus:** All grades

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Open app in incognito/new device | Landing page loads within 3 seconds | |
| 2 | Observe guest banner | Shows "Guest: 3/3 topics left" | |
| 3 | Click any topic (e.g., "Integers") | Topic card expands showing 6 level indicators | |
| 4 | Click Level 1 | Quiz starts, first question appears within 1 second | |
| 5 | Read question | Question text is clear, readable, no truncation | |
| 6 | Click correct answer | Green highlight, "+1 star" animation, streak = 1 | |
| 7 | Click "Show Explanation" | Explanation expands with formatted sections | |
| 8 | Click "Next Question" | New question loads instantly (<500ms) | |
| 9 | Answer 10 questions (8+ correct) | "Level Complete" modal shows "Passed!" | |
| 10 | Click "Continue" | Level 2 starts automatically | |

**Notes for Testers:**
- Time each transition
- Check animations are smooth (60fps)
- Verify star count updates correctly

---

### TC-002: Quiz Session - Happy Path

**Priority:** P0 - Critical
**Grade Focus:** All grades

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Select topic "Fractions" | Topic expands | |
| 2 | Click Level 1 | Quiz begins with Question 1 | |
| 3 | Timer starts | Timer shows "0s" and counts up | |
| 4 | Select correct answer (A/B/C/D) | - Answer highlighted green<br>- Correct answer badge shows<br>- Stars increment<br>- Streak shows "1" | |
| 5 | Select wrong answer (on different question) | - Your answer: red<br>- Correct answer: green<br>- Streak resets to 0<br>- No star deduction | |
| 6 | View explanation after wrong answer | Shows correct answer prominently | |
| 7 | Answer 10 questions total | Progress shows "X/10 correct" | |
| 8 | Achieve 80%+ accuracy (8/10) | Level Complete modal: "Passed!" with celebration | |
| 9 | Achieve <80% accuracy (7/10) | Level Complete modal: "Try Again" | |

---

### TC-003: Failed Level Retry Flow

**Priority:** P0 - Critical
**Grade Focus:** Grade 9-12 (high stakes)

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Start Level 1 quiz | Quiz begins | |
| 2 | Answer 10 questions (only 6 correct) | "Try Again" modal appears | |
| 3 | Click "Retry" | Same level restarts with DIFFERENT questions | |
| 4 | Verify questions are different | Not the same questions as before | |
| 5 | Pass on retry (8+ correct) | Level advances | |
| 6 | Check `masteredCleanly` flag | Should be FALSE (retry was needed) | |

---

### TC-004: Hint System (Level 4+)

**Priority:** P0 - Critical
**Grade Focus:** Grade 7-8 (need more help)

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Start Level 1 question | NO "Need a hint?" button visible | |
| 2 | Start Level 2 question | NO hint button | |
| 3 | Start Level 3 question | NO hint button | |
| 4 | Start Level 4+ question (with hints) | "Need a hint?" button visible | |
| 5 | Click "Need a hint?" | First hint reveals, star count UNCHANGED | |
| 6 | Click "Need another hint?" | Second hint reveals, NO star cost | |
| 7 | Click again (if 3 hints exist) | Third hint reveals, button disappears | |
| 8 | Answer question | Stars earned same as without hints | |
| 9 | Go to next question | Hints reset (hidden) | |

**Regression Check:** Hints were changed from costing stars to FREE. Verify no star deduction.

---

### TC-005: Session Persistence (Page Refresh)

**Priority:** P0 - Critical
**Grade Focus:** All (network issues common in India)

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Start quiz, answer 5 questions | Progress shows "5/10" | |
| 2 | Note current level and score | Record: Level X, Y/Z correct | |
| 3 | Refresh page (F5 or swipe down on mobile) | Page reloads | |
| 4 | Verify topic selection | Same topic is selected | |
| 5 | Verify level | Same level (not reset to 1) | |
| 6 | Verify question progress | Shows "5/10" or close | |
| 7 | Complete remaining questions | Level complete modal appears normally | |
| 8 | Close browser, reopen app | Progress preserved | |

---

### TC-006: Topic Switching (Session Per Topic)

**Priority:** P0 - Critical
**Grade Focus:** All

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Start "Integers" Level 2, answer 5 questions | Progress: 5/10 | |
| 2 | Exit to topic selection | Can go back to dashboard | |
| 3 | Select "Fractions" | Fractions quiz starts fresh | |
| 4 | Answer 3 questions in Fractions | Progress: 3/10 | |
| 5 | Return to topic selection | Can navigate back | |
| 6 | Select "Integers" again | **Integers resumes at 5/10** | |
| 7 | Complete Integers level | Level advances normally | |
| 8 | Return to Fractions | **Fractions resumes at 3/10** | |

---

### TC-007: Star Sync (Logged In User)

**Priority:** P0 - Critical
**Grade Focus:** All

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Log in to account | Welcome toast, stars sync from database | |
| 2 | Note initial star count | Record: X stars | |
| 3 | Answer 5 correct questions | Stars increase in UI | |
| 4 | Open same account on different device | Same star count visible | |
| 5 | Earn more stars on Device 2 | Stars update | |
| 6 | Return to Device 1, refresh | Stars synced from database | |
| 7 | Go offline on Device 1, answer questions | Stars update locally | |
| 8 | Go online | Stars sync to database | |

---

### TC-008: Guest Limits

**Priority:** P0 - Critical
**Grade Focus:** All (conversion to signup)

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Open app as guest (incognito) | Banner shows "Guest: 3/3 topics left" | |
| 2 | Access first topic | Banner updates "2/3 topics left" | |
| 3 | Access second topic | Banner updates "1/3 topics left" | |
| 4 | Access third topic | Banner updates "0/3 topics left" | |
| 5 | Try to access fourth topic | Sign-up prompt modal appears | |
| 6 | Can still access original 3 topics | No block on previously accessed | |
| 7 | Sign up for account | Full access granted | |

---

### TC-009: Level Unlock (Skip-Ahead)

**Priority:** P1 - High
**Grade Focus:** Grade 11-12 (want to skip easy content)

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | View topic with locked Level 3 | Padlock icon visible on Level 3+ | |
| 2 | Click padlock on Level 3 | "Unlock Assessment" modal appears | |
| 3 | Read assessment explanation | Clear instructions (3 questions, need 2/3) | |
| 4 | Start assessment | 3 questions from target level load | |
| 5 | Answer 2/3 correctly | "Level Unlocked!" celebration | |
| 6 | Click locked level now | Quiz starts at that level | |
| 7 | Fail assessment (0/3 or 1/3) | "Try again later" message | |
| 8 | All levels below also unlock | Level 1, 2 marked as accessible | |

---

### TC-010: Review Mode

**Priority:** P1 - High
**Grade Focus:** Grade 9-12 (revision before exams)

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Complete some questions in a topic | At least 5 correctly answered | |
| 2 | Click three-dot menu on topic card | Dropdown appears | |
| 3 | Click "Review Solved (X)" | Review mode starts | |
| 4 | Answer questions in review mode | Can re-answer without consequences | |
| 5 | Check progress after review | **No change to level stats** | |
| 6 | Check stars after review | **No star changes** | |
| 7 | Topic with 0 solved questions | "Review Solved" option hidden | |

---

### TC-011: Reset Progress

**Priority:** P1 - High
**Grade Focus:** All (fresh start)

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Have progress in a topic | At least Level 1 mastered | |
| 2 | Click three-dot menu | Dropdown appears | |
| 3 | Click "Reset Progress" | Confirmation dialog appears | |
| 4 | Read warning message | "This cannot be undone" warning | |
| 5 | Click "Cancel" | Dialog closes, no change | |
| 6 | Click "Reset Progress" again, then "Confirm" | - Toast: "Progress reset"<br>- Level indicators reset<br>- Questions become unsolved | |
| 7 | Start topic again | Starts from Level 1 | |

---

### TC-012: Spaced Repetition (Due Topics)

**Priority:** P1 - High
**Grade Focus:** All (long-term retention)

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Complete a topic with low accuracy (<70%) | Topic added to SR schedule | |
| 2 | Wait for review due date (or mock date) | Bell icon appears on topic | |
| 3 | Click topic with bell icon | Review session starts | |
| 4 | Complete review successfully (80%+) | Bell icon removed | |
| 5 | Complete topic with high accuracy (90%+) | Longer interval before next review | |

---

### TC-013: Mixed Mode Quiz

**Priority:** P1 - High
**Grade Focus:** Grade 9-12 (revision)

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Click "Mix All Topics" button | Mixed quiz starts | |
| 2 | Answer questions | Questions from various topics appear | |
| 3 | Check topic indicators | Each question shows which topic it's from | |
| 4 | Answer 10+ questions | Questions cycle through topics | |
| 5 | View session summary | Breakdown by topic shown | |

---

### TC-014: Daily Challenge

**Priority:** P2 - Medium
**Grade Focus:** All (engagement)

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Open app (new day) | Daily Challenge card visible | |
| 2 | Start challenge | Timed quiz begins | |
| 3 | Complete challenge | Bonus stars awarded | |
| 4 | Try starting challenge again | "Already completed today" message | |
| 5 | Next day | New challenge available | |

---

## Mobile-Specific Tests

### TC-M01: Touch Responsiveness

**Priority:** P0 - Critical
**Devices:** All mobile

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Tap answer option | Response within 100ms | |
| 2 | Tap in rapid succession | No double-selection, no freeze | |
| 3 | Verify touch targets | All buttons at least 44x44px | |
| 4 | Swipe gestures (if any) | Smooth, no stutter | |
| 5 | Scroll through explanation | Smooth scrolling | |

---

### TC-M02: Orientation Changes

**Priority:** P1 - High
**Devices:** Tablets

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Start quiz in portrait | Full UI visible | |
| 2 | Rotate to landscape | Layout adapts, no content cut off | |
| 3 | Answer question in landscape | Works normally | |
| 4 | Rotate back to portrait | No state loss | |

---

### TC-M03: Low Memory Conditions

**Priority:** P0 - Critical
**Devices:** Budget Android (2GB RAM)

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Open multiple apps in background | Memory pressure | |
| 2 | Switch to quiz app | App doesn't crash | |
| 3 | Answer questions | Responsive, no freeze | |
| 4 | Switch away and back | State preserved | |
| 5 | Answer 50+ questions in session | No memory leak, no slowdown | |

---

### TC-M04: Network Transition

**Priority:** P0 - Critical
**Devices:** All mobile

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Start quiz on WiFi | Works normally | |
| 2 | Switch to cellular (4G) | No interruption | |
| 3 | Enter low signal area | Graceful degradation | |
| 4 | Go completely offline | Can still answer (local validation) | |
| 5 | Come back online | Syncs progress | |

---

## Accessibility Tests

### TC-A01: Screen Reader Compatibility

**Priority:** P1 - High
**Tools:** VoiceOver (iOS), TalkBack (Android)

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Navigate to question | Question text read aloud | |
| 2 | Navigate through options | "Option A: [text]" format | |
| 3 | Select answer | "Selected" announced | |
| 4 | Hear feedback | "Correct/Incorrect" announced | |
| 5 | Navigate explanation | Sections read in order | |

---

### TC-A02: Keyboard Navigation

**Priority:** P1 - High
**Devices:** Desktop

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Tab through dashboard | Focus moves logically | |
| 2 | Enter on topic | Topic expands | |
| 3 | Tab to level indicator | Can select level | |
| 4 | Tab to quiz options | Can navigate A/B/C/D | |
| 5 | Enter/Space selects answer | Answer submitted | |
| 6 | Escape exits quiz (if applicable) | Confirmation shown | |

---

### TC-A03: Color Contrast

**Priority:** P2 - Medium
**Tools:** Chrome DevTools, axe

| Element | Test | Expected |
|---------|------|----------|
| Question text | Background contrast | 4.5:1 minimum |
| Correct answer (green) | Contrast ratio | Clear distinction |
| Incorrect answer (red) | Contrast ratio | Clear distinction |
| Timer warning (amber) | Contrast ratio | Readable |
| Hint text (amber) | Contrast ratio | Readable |

---

## Performance Tests

### TC-P01: Load Times

**Priority:** P0 - Critical
**Network:** 4G

| Metric | Target | Actual | Pass/Fail |
|--------|--------|--------|-----------|
| Initial app load | <3 seconds | | |
| Topic selection | <1 second | | |
| Question load | <500ms | | |
| Answer feedback | <100ms | | |
| Explanation expand | <200ms | | |

---

### TC-P02: Animation Smoothness

**Priority:** P1 - High
**Tools:** Chrome DevTools Performance tab

| Animation | Target FPS | Actual | Pass/Fail |
|-----------|------------|--------|-----------|
| Option hover | 60fps | | |
| Answer selection | 60fps | | |
| Correct/Incorrect highlight | 60fps | | |
| Explanation expand | 60fps | | |
| Level complete modal | 60fps | | |
| Category expand/collapse | 60fps | | |

---

### TC-P03: Memory Usage

**Priority:** P1 - High
**Tools:** Chrome DevTools Memory tab

| Test | Threshold | Actual | Pass/Fail |
|------|-----------|--------|-----------|
| Initial memory | <50MB | | |
| After 50 questions | <80MB | | |
| After 100 questions | <100MB | | |
| No memory leak after navigation | Stable | | |

---

## Edge Cases & Stress Tests

### TC-E01: Rapid Answer Changes

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click option A | A highlights |
| 2 | Immediately click B | Only B highlights (A resets) |
| 3 | Immediately click C | Only C highlights |
| 4 | Wait for validation | C is submitted |

---

### TC-E02: Long Questions/Options

| Test | Input | Expected |
|------|-------|----------|
| Long question | 500+ characters | Wraps properly, readable |
| Long option | 200+ characters | Wraps, touch target still works |
| Mathematical notation | x^2 + y^2 = z^2 | Displays correctly |
| Unicode | \u03C0, \u221A | Renders correctly |

---

### TC-E03: Concurrent Sessions

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open app in two browser tabs | Both load |
| 2 | Answer question in Tab 1 | Progress updates in Tab 1 |
| 3 | Refresh Tab 2 | Tab 2 shows updated progress |
| 4 | Answer in both tabs simultaneously | No data corruption |

---

## Bug Report Template

```
**Title:** [Brief description]

**Severity:** P0/P1/P2/P3

**Environment:**
- Device: [Model]
- OS: [Version]
- Browser: [Version]
- Network: [WiFi/4G/3G]

**Steps to Reproduce:**
1.
2.
3.

**Expected Result:**
[What should happen]

**Actual Result:**
[What actually happened]

**Screenshots/Video:**
[Attach if applicable]

**Notes:**
[Any additional context]
```

---

## Test Execution Checklist

### Pre-Release Checklist

- [ ] TC-001: First-time user flow
- [ ] TC-002: Happy path quiz
- [ ] TC-004: Hint system (FREE hints)
- [ ] TC-005: Session persistence
- [ ] TC-006: Topic switching
- [ ] TC-007: Star sync
- [ ] TC-M01: Touch responsiveness
- [ ] TC-M04: Network transitions
- [ ] TC-P01: Load times within targets

### Regression Checklist (After Code Changes)

- [ ] Level regression bug not reintroduced
- [ ] Hints remain FREE
- [ ] 80% threshold (not 90%)
- [ ] 10 questions per level (not 5)
- [ ] Session persists per topic
- [ ] Stars sync correctly

---

## Severity Definitions

| Severity | Definition | Examples |
|----------|------------|----------|
| **P0** | Blocking - App unusable | Crash, data loss, infinite loop |
| **P1** | Critical - Major feature broken | Wrong score, stuck state, sync failure |
| **P2** | Major - Feature degraded | Slow performance, UI glitch, minor data issue |
| **P3** | Minor - Cosmetic | Alignment off, typo, animation jank |

---

*Last Updated: Feb 2026*
*Version: 1.0*
