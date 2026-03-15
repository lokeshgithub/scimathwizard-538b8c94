import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle2, XCircle, ChevronDown, ChevronUp, Star, Send, ClipboardCheck } from "lucide-react";

interface Checkpoint {
  id: string;
  step: string;
  action: string;
  expected: string;
  result: "pass" | "fail" | null;
}

interface TestScenario {
  number: number;
  name: string;
  icon: string;
  time: string;
  requiresLogin: boolean;
  checkpoints: Omit<Checkpoint, "result">[];
}

const TEST_SCENARIOS: TestScenario[] = [
  {
    number: 1,
    name: "First Visit Experience",
    icon: "⭐",
    time: "3 min",
    requiresLogin: false,
    checkpoints: [
      { id: "1.1", step: "1.1", action: "Open the app link", expected: "App loads without errors, you see a welcome screen or dashboard" },
      { id: "1.2", step: "1.2", action: "If a welcome popup appears, read it", expected: "It should explain what the app does" },
      { id: "1.3", step: "1.3", action: "Close/dismiss the welcome popup", expected: "Dashboard with Math topics should appear" },
      { id: "1.4", step: "1.4", action: "Look at the top of the screen", expected: "You should see subject tabs (Math, Physics, Chemistry)" },
      { id: "1.5", step: "1.5", action: "Look for a mode badge (📚 Focused or 🎮 Fun)", expected: "Badge should be visible near the top" },
    ],
  },
  {
    number: 2,
    name: "Quiz Flow",
    icon: "⭐⭐",
    time: "5-7 min",
    requiresLogin: false,
    checkpoints: [
      { id: "2.1", step: "2.1", action: "Find 'Integers' in the topic list and tap/click it", expected: "Topic expands showing level buttons (Level 1, 2, etc.)" },
      { id: "2.2", step: "2.2", action: "Tap 'Level 1'", expected: "A quiz question appears with 4 answer choices (A, B, C, D)" },
      { id: "2.3", step: "2.3", action: "Read the question carefully", expected: "Question text is clear and readable" },
      { id: "2.4", step: "2.4", action: "Select an answer", expected: "Your choice is highlighted" },
      { id: "2.5", step: "2.5", action: "Check the feedback", expected: "You should see if you were correct or wrong, with an explanation" },
      { id: "2.6", step: "2.6", action: "Answer 5 more questions (6 total)", expected: "Progress updates (e.g., '3/10 correct')" },
      { id: "2.7", step: "2.7", action: "Look for a 'Hint' button", expected: "Tapping it shows a helpful hint (FREE, no cost)" },
      { id: "2.8", step: "2.8", action: "Continue until you finish 10 questions OR tap 'End Session'", expected: "Session summary appears showing your score" },
    ],
  },
  {
    number: 3,
    name: "Switching Subjects",
    icon: "📚",
    time: "2 min",
    requiresLogin: false,
    checkpoints: [
      { id: "3.1", step: "3.1", action: "Go back to the dashboard (home screen)", expected: "Dashboard loads" },
      { id: "3.2", step: "3.2", action: "Tap 'Physics' tab", expected: "Physics topics appear (different from Math)" },
      { id: "3.3", step: "3.3", action: "Tap 'Chemistry' tab", expected: "Chemistry topics appear" },
      { id: "3.4", step: "3.4", action: "Tap 'Math' tab again", expected: "Math topics come back" },
      { id: "3.5", step: "3.5", action: "Close the app completely, then reopen", expected: "The last subject you selected should still be active" },
    ],
  },
  {
    number: 4,
    name: "Learning Mode Toggle",
    icon: "🎮",
    time: "3 min",
    requiresLogin: false,
    checkpoints: [
      { id: "4.1", step: "4.1", action: "Find and tap the Profile icon (bottom nav or top)", expected: "Profile page opens" },
      { id: "4.2", step: "4.2", action: "Look for 'Learning Mode' toggle", expected: "You should see Focused / Fun mode options" },
      { id: "4.3", step: "4.3", action: "Switch to Fun Mode (🎮)", expected: "Page styling may change, badge updates to 🎮 Fun" },
      { id: "4.4", step: "4.4", action: "Go back to dashboard", expected: "You should see Star Shop, more colorful elements" },
      { id: "4.5", step: "4.5", action: "Go to Profile → switch to Focused Mode (📚)", expected: "Dashboard becomes cleaner, Star Shop hidden" },
      { id: "4.6", step: "4.6", action: "Start a quiz in Focused Mode", expected: "Stats show 'Accuracy %' instead of stars" },
    ],
  },
  {
    number: 5,
    name: "Sign Up & Report",
    icon: "⭐⭐",
    time: "5 min",
    requiresLogin: true,
    checkpoints: [
      { id: "5.1", step: "5.1", action: "Tap 'Sign In' or the login button", expected: "Auth page appears" },
      { id: "5.2", step: "5.2", action: "Choose 'Sign Up' and enter your email + password", expected: "Account creation starts" },
      { id: "5.3", step: "5.3", action: "Check your email for a verification link", expected: "You should receive a verification email" },
      { id: "5.4", step: "5.4", action: "Click the verification link, then sign in", expected: "You're now logged in, dashboard shows your name/avatar" },
      { id: "5.5", step: "5.5", action: "Complete a full quiz session (10 questions)", expected: "Session summary appears with your results" },
      { id: "5.6", step: "5.6", action: "Look for a success toast/notification", expected: "'Session saved!' message should appear" },
      { id: "5.7", step: "5.7", action: "Tap 'Report' in the navigation", expected: "Report page loads" },
      { id: "5.8", step: "5.8", action: "Check if your session appears in the report", expected: "Your recent session should be listed with correct stats" },
    ],
  },
  {
    number: 6,
    name: "Mobile Experience",
    icon: "📱",
    time: "3 min",
    requiresLogin: false,
    checkpoints: [
      { id: "6.1", step: "6.1", action: "Open app on your phone", expected: "Layout fits the screen, no horizontal scrolling" },
      { id: "6.2", step: "6.2", action: "Check the bottom navigation bar", expected: "You should see Home, Report, Profile icons" },
      { id: "6.3", step: "6.3", action: "Try answering a quiz question", expected: "Buttons are large enough to tap easily" },
      { id: "6.4", step: "6.4", action: "Scroll through the topic list", expected: "Smooth scrolling, no jumping or lag" },
      { id: "6.5", step: "6.5", action: "Rotate your phone to landscape", expected: "App still looks good (or stays in portrait)" },
    ],
  },
  {
    number: 7,
    name: "Edge Cases & Breaking Things",
    icon: "💥",
    time: "3 min",
    requiresLogin: false,
    checkpoints: [
      { id: "7.1", step: "7.1", action: "Tap an answer really fast multiple times", expected: "Only one answer should register" },
      { id: "7.2", step: "7.2", action: "Turn off internet, then try to use the app", expected: "You should see an offline indicator, not a crash" },
      { id: "7.3", step: "7.3", action: "Turn internet back on", expected: "App should recover automatically" },
      { id: "7.4", step: "7.4", action: "Press the browser back button during a quiz", expected: "App should handle it gracefully (no crash)" },
      { id: "7.5", step: "7.5", action: "Open app in two tabs at the same time", expected: "Both should work without conflict" },
    ],
  },
  {
    number: 8,
    name: "Guided Learn & Adaptive Challenge",
    icon: "🧠",
    time: "5 min",
    requiresLogin: false,
    checkpoints: [
      { id: "8.1", step: "8.1", action: "Find 'Guided Learn' in the navigation", expected: "Page loads with lesson content" },
      { id: "8.2", step: "8.2", action: "Find 'Adaptive Challenge'", expected: "Challenge starts with mixed-difficulty questions" },
      { id: "8.3", step: "8.3", action: "Answer questions — they should get harder/easier", expected: "Difficulty adapts to your performance" },
      { id: "8.4", step: "8.4", action: "Complete the challenge", expected: "Results page shows your skill tier and score" },
    ],
  },
];

type TestResults = Record<number, { checkpoints: Record<string, "pass" | "fail" | null>; notes: string }>;

const TestFeedback = () => {
  const [step, setStep] = useState<"info" | "tests" | "summary" | "done">("info");
  const [testerName, setTesterName] = useState("");
  const [device, setDevice] = useState("");
  const [browser, setBrowser] = useState("");
  const [expandedTest, setExpandedTest] = useState<number | null>(1);
  const [submitting, setSubmitting] = useState(false);

  const [testResults, setTestResults] = useState<TestResults>(() => {
    const initial: TestResults = {};
    TEST_SCENARIOS.forEach((t) => {
      const cps: Record<string, "pass" | "fail" | null> = {};
      t.checkpoints.forEach((c) => (cps[c.id] = null));
      initial[t.number] = { checkpoints: cps, notes: "" };
    });
    return initial;
  });

  // Summary state
  const [favoriteFeature, setFavoriteFeature] = useState("");
  const [mostConfusing, setMostConfusing] = useState("");
  const [suggestions, setSuggestions] = useState("");
  const [bugsFound, setBugsFound] = useState("");
  const [rating, setRating] = useState(0);
  const [modeTested, setModeTested] = useState("");

  const toggleCheckpoint = (testNum: number, cpId: string) => {
    setTestResults((prev) => {
      const current = prev[testNum].checkpoints[cpId];
      const next = current === null ? "pass" : current === "pass" ? "fail" : null;
      return {
        ...prev,
        [testNum]: {
          ...prev[testNum],
          checkpoints: { ...prev[testNum].checkpoints, [cpId]: next },
        },
      };
    });
  };

  const setNotes = (testNum: number, notes: string) => {
    setTestResults((prev) => ({
      ...prev,
      [testNum]: { ...prev[testNum], notes },
    }));
  };

  const getTestScore = (testNum: number) => {
    const cps = testResults[testNum].checkpoints;
    const total = Object.keys(cps).length;
    const passed = Object.values(cps).filter((v) => v === "pass").length;
    const answered = Object.values(cps).filter((v) => v !== null).length;
    return { passed, total, answered };
  };

  const handleSubmit = async () => {
    if (!testerName.trim() || !device.trim() || !browser.trim()) {
      toast.error("Please fill in your name, device, and browser first");
      return;
    }
    setSubmitting(true);

    try {
      // Submit per-test feedback
      const feedbackRows = TEST_SCENARIOS.map((t) => ({
        tester_name: testerName.trim(),
        device: device.trim(),
        browser: browser.trim(),
        test_number: t.number,
        test_name: t.name,
        checkpoints: Object.entries(testResults[t.number].checkpoints).map(([id, result]) => ({
          id,
          result: result ?? "skipped",
        })),
        notes: testResults[t.number].notes || null,
      }));

      const { error: feedbackError } = await supabase.from("test_feedback").insert(feedbackRows);
      if (feedbackError) throw feedbackError;

      // Submit overall feedback
      const { error: overallError } = await supabase.from("test_overall_feedback").insert({
        tester_name: testerName.trim(),
        device: device.trim(),
        browser: browser.trim(),
        favorite_feature: favoriteFeature || null,
        most_confusing: mostConfusing || null,
        suggestions: suggestions || null,
        bugs_found: bugsFound || null,
        rating: rating || null,
        mode_tested: modeTested || null,
      });
      if (overallError) throw overallError;

      toast.success("Thank you! Your feedback has been submitted! 🎉");
      setStep("done");
    } catch (err: any) {
      console.error("Feedback submit error:", err);
      toast.error("Failed to submit feedback. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const totalScore = TEST_SCENARIOS.reduce((acc, t) => acc + getTestScore(t.number).passed, 0);
  const totalCheckpoints = TEST_SCENARIOS.reduce((acc, t) => acc + getTestScore(t.number).total, 0);

  if (step === "done") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <div className="text-6xl">🎉</div>
            <h2 className="text-2xl font-bold text-foreground">Thank You!</h2>
            <p className="text-muted-foreground">
              Your feedback has been submitted successfully. It will help make SciMathWizard better for all students!
            </p>
            <Button onClick={() => window.location.href = "/"} className="mt-4">
              Back to App
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === "info") {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-lg mx-auto space-y-6">
          <div className="text-center space-y-2">
            <ClipboardCheck className="w-12 h-12 text-primary mx-auto" />
            <h1 className="text-2xl font-bold text-foreground">SciMathWizard Testing</h1>
            <p className="text-muted-foreground">Help us make this app better! Fill in your details to start testing.</p>
          </div>

          <Card>
            <CardContent className="pt-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground">Your Name *</label>
                <Input
                  value={testerName}
                  onChange={(e) => setTesterName(e.target.value)}
                  placeholder="e.g., Rahul S."
                  maxLength={100}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Device *</label>
                <Input
                  value={device}
                  onChange={(e) => setDevice(e.target.value)}
                  placeholder="e.g., iPhone 14, Samsung Galaxy S23, Laptop"
                  maxLength={100}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Browser *</label>
                <Input
                  value={browser}
                  onChange={(e) => setBrowser(e.target.value)}
                  placeholder="e.g., Chrome, Safari, Firefox"
                  maxLength={100}
                />
              </div>
              <Button
                onClick={() => setStep("tests")}
                disabled={!testerName.trim() || !device.trim() || !browser.trim()}
                className="w-full"
              >
                Start Testing →
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (step === "summary") {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-lg mx-auto space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-foreground">Overall Feedback</h1>
            <p className="text-muted-foreground">
              Score: {totalScore}/{totalCheckpoints} checkpoints passed
            </p>
          </div>

          <Card>
            <CardContent className="pt-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground">Which mode did you test?</label>
                <div className="flex gap-2 mt-1">
                  {["Focused", "Fun", "Both"].map((m) => (
                    <Button
                      key={m}
                      variant={modeTested === m ? "default" : "outline"}
                      size="sm"
                      onClick={() => setModeTested(m)}
                    >
                      {m}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground">Favorite Feature</label>
                <Input
                  value={favoriteFeature}
                  onChange={(e) => setFavoriteFeature(e.target.value)}
                  placeholder="What did you like most?"
                  maxLength={500}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground">Most Confusing Part</label>
                <Input
                  value={mostConfusing}
                  onChange={(e) => setMostConfusing(e.target.value)}
                  placeholder="What was hard to understand?"
                  maxLength={500}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground">Suggestions</label>
                <Textarea
                  value={suggestions}
                  onChange={(e) => setSuggestions(e.target.value)}
                  placeholder="Any ideas to improve the app?"
                  maxLength={1000}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground">Bugs Found</label>
                <Textarea
                  value={bugsFound}
                  onChange={(e) => setBugsFound(e.target.value)}
                  placeholder="Describe any bugs (what you tapped, what happened, what device/browser)"
                  maxLength={2000}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground">Rating (1-5 stars)</label>
                <div className="flex gap-1 mt-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button key={s} onClick={() => setRating(s)} className="p-1">
                      <Star
                        className={`w-8 h-8 ${s <= rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setStep("tests")} className="flex-1">
                  ← Back to Tests
                </Button>
                <Button onClick={handleSubmit} disabled={submitting} className="flex-1">
                  <Send className="w-4 h-4 mr-2" />
                  {submitting ? "Submitting..." : "Submit Feedback"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Tests step
  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Testing Checklist</h1>
            <p className="text-sm text-muted-foreground">
              Tester: {testerName} • {totalScore}/{totalCheckpoints} passed
            </p>
          </div>
          <Button onClick={() => setStep("summary")} size="sm">
            Finish & Review →
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Tap each checkpoint: <span className="text-green-500">✅ Pass</span> → <span className="text-red-500">❌ Fail</span> → ⬜ Reset. Add notes for any issues.
        </p>

        {TEST_SCENARIOS.map((scenario) => {
          const { passed, total, answered } = getTestScore(scenario.number);
          const isExpanded = expandedTest === scenario.number;

          return (
            <Card key={scenario.number} className="overflow-hidden">
              <button
                className="w-full text-left p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
                onClick={() => setExpandedTest(isExpanded ? null : scenario.number)}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{scenario.icon}</span>
                  <div>
                    <p className="font-medium text-foreground text-sm">
                      Test {scenario.number}: {scenario.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {scenario.time} • {scenario.requiresLogin ? "Login needed" : "No login needed"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={answered === total ? (passed === total ? "default" : "destructive") : "secondary"}
                    className="text-xs"
                  >
                    {passed}/{total}
                  </Badge>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </div>
              </button>

              {isExpanded && (
                <CardContent className="pt-0 pb-4 space-y-2">
                  {scenario.checkpoints.map((cp) => {
                    const result = testResults[scenario.number].checkpoints[cp.id];
                    return (
                      <button
                        key={cp.id}
                        onClick={() => toggleCheckpoint(scenario.number, cp.id)}
                        className={`w-full text-left p-3 rounded-lg border transition-colors ${
                          result === "pass"
                            ? "border-green-500/30 bg-green-500/5"
                            : result === "fail"
                            ? "border-red-500/30 bg-red-500/5"
                            : "border-border bg-card"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5">
                            {result === "pass" ? (
                              <CheckCircle2 className="w-5 h-5 text-green-500" />
                            ) : result === "fail" ? (
                              <XCircle className="w-5 h-5 text-red-500" />
                            ) : (
                              <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground">{cp.step}: {cp.action}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">Expected: {cp.expected}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}

                  <div className="pt-2">
                    <Textarea
                      value={testResults[scenario.number].notes}
                      onChange={(e) => setNotes(scenario.number, e.target.value)}
                      placeholder={`Notes for Test ${scenario.number}... (bugs, confusing parts, suggestions)`}
                      className="text-sm"
                      maxLength={1000}
                    />
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}

        <div className="sticky bottom-16 md:bottom-4 pt-2 pb-2">
          <Button onClick={() => setStep("summary")} className="w-full" size="lg">
            Finish & Review ({totalScore}/{totalCheckpoints} passed) →
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TestFeedback;
