# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Active Session File

**Resume testing work:** Read `.claude/session_testing_2feb2026.md` for context on E2E test setup and pending fixes.

## Project Overview

SciMathWizard (Magic Mastery Quiz) is a full-stack educational web application built with React 18, TypeScript, and Supabase. It features a gamified quiz system with multi-subject support, adaptive learning, and multiplayer battle modes.

## Current State (as of Feb 1, 2026)

### Recent Changes Implemented (4-Phase Plan)

**Phase 1: Free Hints + Error Handling** ✅
- Hints are now FREE (no star cost) - struggling students need MORE help
- Error banners display in QuizCard, SessionSummary, and Auth pages

**Phase 2: Assessment Validity** ✅
- Questions per level: 10 (was 5)
- Pass threshold: 80% (was 90%)
- Added `masteredCleanly` and `attemptCount` tracking
- Schema version 2 with migration logic for localStorage

**Phase 3: Spaced Repetition Integration** ✅
- Auto-adds weak topics to SR schedule
- Bell icon indicators on TopicDashboard for due reviews

**Phase 4: Gamification Rebalancing** ✅
- Level-based star rewards (higher levels = more stars)
- Streak bonus capped at 3x to prevent easy-topic grinding
- New achievement types: Growth Mindset, Deep Learner, Memory Master

### Bug Fixes Applied

1. **TSV Parsing Fix** (`questionService.ts:932-945`)
   - TSV files now use simple split (no quote handling)
   - Previously, unbalanced quotes in explanations caused 85+ questions to be silently dropped

2. **Fuzzy Topic Matching** (`questionService.ts:478-540`)
   - Auto-maps similar topic names to blueprint (60% similarity threshold)
   - Extended TOPIC_NAME_MAP with 100+ variations
   - Uses Levenshtein distance + word overlap for matching

### Data Status

- **Subject**: Math (9 topics)
- **Total Questions**: ~2,837
- **Questions per topic**: ~315 (50 per level × 6 levels + some variation)
- **All topics match blueprint** (no "Not in Blueprint" warnings)

### Blueprint Topics (Math)
```
Integers, Rational Numbers, Fractions, Decimals, Exponents and Powers,
Ratio and Proportion, Unitary Methods, Percentages, Profit and Loss,
Simple Interest, Algebraic Expressions, Linear Equations, Set Concepts,
Lines and Angles, Triangles, Pythagoras Theorem, Congruence, Symmetry,
Perimeter and Area, Mensuration, Quadrilaterals, Circles, Constructions,
Data Handling, Probability
```

### Data Files Location
```
/Users/lokesh/Documents-Local/JainiLearning_v2/github_repos_scimathwizard/data_scimathwizard/PRODUCTION_READY_DATASET_V6_FINAL/
├── ch01_integers/
├── ch02_rational_numbers/
├── ch03_fractions/
├── ch04_decimals/
├── ch05_exponents/
├── ch06_ratio_proportion/
├── ch07_unitary_method/
├── ch08_percent_percentage/
└── ch09_profit_loss_discount/
```

Each folder contains a `*_master_v5.tsv` file with 315 questions (50 per level × 6 levels + 15 extra in level 3).

## Commands

```bash
npm run dev          # Start dev server on localhost:8080
npm run build        # Production build
npm run lint         # Run ESLint
npm run test         # Run tests once (Vitest)
npm run test:watch   # Run tests in watch mode
```

## Architecture

### State Management
- **useQuizStore** (`src/hooks/useQuizStore.ts`): Central state store managing quiz progress, topic selection, level tracking, session stats, and mastery tracking. This is the primary hook for quiz functionality.

### Key Hooks
- `useAuth.ts`: Authentication and profile management via Supabase
- `useAdaptiveChallenge.ts`: Adaptive learning difficulty logic
- `useBattleRoom.ts`: Multiplayer battle room logic
- `useDailyChallenge.ts`: Daily challenge generation and tracking

### Services
- `questionService.ts`: Question loading, parsing (CSV/TSV/Excel), topic normalization, fuzzy matching
- `feedbackService.ts`: AI-powered feedback system
- `spacedRepetitionService.ts`: Spaced repetition algorithm (SM-2)

### Data Flow
1. User actions → React components
2. State changes → useQuizStore hooks
3. Database sync → Supabase via useAuth
4. UI updates → React re-render with Framer Motion animations

### Quiz System
- **6-level mastery progression** per topic (Fundamentals → Grand Master)
- **10 questions per level**, 80% accuracy threshold to advance
- Mixed mode supports multi-topic quizzing
- Session tracking with stars, solved count, and streak
- Free hints (max 3 per question)

### Component Structure
- `src/components/ui/`: shadcn/ui base components
- `src/components/quiz/`: Quiz-related components (QuizCard, TopicDashboard, MasteryPanel, etc.)
- `src/components/adaptive/`: Adaptive learning components
- `src/pages/`: Route-level page components

### Database (Supabase)
- `subjects`: Subject definitions (Math, Physics, Chemistry)
- `topics`: Topic names linked to subjects
- `questions`: Questions with level (1-6+), options, correct answer, explanation, hints
- `profiles`: User data, grades, stars, streaks, topics mastered
- `adaptive_challenge_results`: Adaptive quiz performance
- `friend_challenges`: Multiplayer battle rooms
- Migrations in `supabase/migrations/`

### Supabase Connection
```
URL: https://wjuoghoahuyxvascddak.supabase.co
Project ID: wjuoghoahuyxvascddak
```

## Path Aliases

Use `@/*` to import from `src/*`:
```typescript
import { Button } from "@/components/ui/button";
```

## Tech Stack

- **UI**: React 18 + shadcn/ui (Radix primitives) + Tailwind CSS
- **Animations**: Framer Motion
- **Data**: React Query + Supabase (PostgreSQL)
- **Forms**: React Hook Form + Zod validation
- **Export**: jsPDF for certificates, XLSX for reports

## Claude Agents & Experts

Custom agents are defined in `.claude/` for specialized tasks:

### Test Agent (`.claude/test-agent.md`)
A UI testing expert for generating exhaustive automated and manual test cases.
- **Target users:** Grade 7-12 students (ages 12-18)
- **Focus:** Competitive exam apps (IIT-JEE Foundation, Olympiads, NTSE)
- **Outputs:** Vitest automated tests + manual test case tables

**Usage:**
```
As the Test Agent from .claude/test-agent.md, create automated tests for [component]
As the Test Agent from .claude/test-agent.md, create manual test cases for [feature]
```

### Expert Personas (`.claude/experts.md`)
Review personas for code quality:
- **UI Expert:** Accessibility, responsive design, performance
- **UX Expert:** User flows, error handling, cognitive load
- **Education Expert:** Pedagogical soundness, assessment validity

**Usage:**
```
Review this code as the [UI/UX/Education] Expert from .claude/experts.md
```

## Known Issues / Future Work

1. **CSS warning**: `@import must precede all other statements` in index.css (cosmetic, doesn't affect functionality)
2. **Manual testing pending** for the 4-phase implementation features
