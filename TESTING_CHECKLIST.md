# Testing Checklist - Feb 11, 2026

## Current State Summary

### ✅ What's Already Done (Today's Work)
1. **Database migrations applied** - `session_id` column exists and is NOT NULL
2. **Lazy-loading implemented** - Questions load per-topic
3. **Report system working** - Code expects `session_id` to exist
4. **Test suite created** - 7/12 passing (58%)

### 📦 Files Created (Documentation)
- `TEST_SUMMARY.md` - Complete analysis of last 7 days
- `NEXT_STEPS.md` - Detailed action plan
- `QUICK_START.md` - Quick reference
- `e2e/critical-path-v2.spec.ts` - Improved tests with modal handling
- `e2e/helpers/test-setup.ts` - Reusable test utilities

---

## 🧪 Manual Testing (15 minutes)

### Test 1: Basic Quiz Flow (5 min)
**Purpose:** Verify core functionality works

```bash
# Terminal 1: Start dev server
npm run dev
```

**Steps:**
1. Open http://localhost:8080
2. ✅ **Check:** Dashboard loads with Math topics
3. Click "Integers" to expand
4. ✅ **Check:** Level buttons appear
5. Click "Level 1" to start quiz
6. ✅ **Check:** Question appears with 4 options
7. Answer 3-5 questions
8. ✅ **Check:** Progress updates (X/10 correct)
9. Complete or exit session
10. ✅ **Check:** Session summary appears

**Expected Result:** No errors, smooth flow

**Console Check:**
- ❌ NO red errors
- ✅ May see info logs (OK)

---

### Test 2: Report System (3 min)
**Purpose:** Verify session saves and displays

**Pre-requisite:** Must be authenticated (signed in)

**Steps:**
1. After completing Test 1 session
2. Look for toast notification in bottom-right
3. ✅ **Check:** Toast shows "Session saved!"
4. Click "Report" button in navigation
5. ✅ **Check:** Report page loads
6. ✅ **Check:** Your session appears in the list
7. Look at "Total Questions" count
8. ✅ **Check:** Matches what you answered

**Console Check:**
```
Should see:
✅ [reportService] Session saved successfully

Should NOT see:
❌ Failed to save session report
❌ column "session_id" does not exist
❌ undefined is not an object
```

**If you see errors:**
- Take screenshot of console
- Note exact error message
- Report back and I'll add safety code

---

### Test 3: Subject Persistence (2 min)
**Purpose:** Verify subject preference saves

**Steps:**
1. On dashboard, click "Physics" tab
2. ✅ **Check:** Physics topics appear
3. Close browser completely
4. Reopen http://localhost:8080
5. ✅ **Check:** Physics tab still selected (not Math)

**Expected Result:** Your subject choice persists

---

### Test 4: Deep Linking (1 min)
**Purpose:** Verify URL parameters work

**Steps:**
1. Open: http://localhost:8080/?topic=fractions
2. ✅ **Check:** Dashboard loads
3. ✅ **Check:** "Fractions" topic visible/expanded

**Expected Result:** No errors, topic loads

---

### Test 5: Session Deduplication (4 min)
**Purpose:** Verify same session doesn't save twice

**Pre-requisite:** Authenticated user

**Steps:**
1. Complete a quiz session (answer 3-5 questions)
2. ✅ **Check:** Toast shows "Session saved!"
3. **DON'T refresh page**
4. Click "End Session" or similar
5. ✅ **Check:** Session summary appears
6. Click away from summary (to dashboard)
7. ✅ **Check:** Toast does NOT appear again
8. Go to Report page
9. ✅ **Check:** Only ONE entry for that session

**Console Check:**
```
First save:
✅ [reportService] Session saved successfully

Second attempt:
✅ [reportService] Duplicate session_id, skipping save: [uuid]
```

**If duplicates appear:**
- Check localStorage for `magical-mastery-saved-session-ids`
- Should contain array of recent session IDs
- Max 100 entries

---

## 🤖 Automated Testing (5 min)

### Run Fast Tests

```bash
# Terminal 2 (keep dev server running in Terminal 1)
npx playwright test e2e/critical-path-v2.spec.ts --reporter=list
```

**Expected Results:**
- ✅ 7+ tests passing
- ❌ Some failures expected (welcome modal issue)
- ⏱️ Should complete in < 2 minutes

**If all fail with "session_id" errors:**
- Migration not applied yet
- Need to add safety code

---

## 📊 Results Summary

### ✅ Success Criteria
- [ ] Quiz flow works (Test 1)
- [ ] Sessions save to database (Test 2)
- [ ] No console errors
- [ ] Subject preference persists (Test 3)
- [ ] Deep linking works (Test 4)
- [ ] No duplicate sessions (Test 5)
- [ ] Tests run without crashing

### ❌ Failure Scenarios

**Scenario 1: "column session_id does not exist"**
→ Migration not applied
→ I'll add safety code to handle this

**Scenario 2: Session doesn't save**
→ Check if authenticated
→ Check console for errors
→ I'll investigate further

**Scenario 3: Duplicate sessions appear**
→ localStorage deduplication not working
→ I'll add database-level checks

**Scenario 4: Tests timeout/fail**
→ Welcome modal blocking clicks
→ I'll improve modal handling

---

## 🚀 After Testing

### If Everything Works ✅
1. Commit test files and docs
2. Focus on new features
3. Run tests periodically

### If Issues Found ❌
1. Document exact error messages
2. Take console screenshots
3. Share with me → I'll fix immediately

---

## 💾 Git Commands (After Testing)

### If Tests Pass - Commit Docs
```bash
# Check auth first
gh auth status  # Should show: lokeshgithub

# Stage documentation files
git add TEST_SUMMARY.md NEXT_STEPS.md QUICK_START.md TESTING_CHECKLIST.md
git add e2e/critical-path-v2.spec.ts e2e/helpers/

# Commit
git commit -m "Add comprehensive testing documentation and improved E2E tests

- Created test summary analyzing last 7 days of changes
- Added step-by-step testing checklist
- Improved critical path tests (58% pass rate)
- Added reusable test helpers for modal handling
- Quick reference guide for common tasks"

# Push
git push
```

---

## 📞 Need Help?

**If you see any errors:**
1. Copy the full console error
2. Note which test failed (Test 1-5)
3. Take screenshot if helpful
4. Tell me - I'll fix it immediately

**Common fixes I can apply:**
- Add try-catch for session_id
- Improve modal dismissal
- Fix test selectors
- Add more robust error handling

---

## Time Estimate

- Manual Testing: 15 min
- Automated Testing: 5 min
- **Total: 20 minutes**

Start with Tests 1 & 2 - those are the most critical!
