import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** Subject-specific teaching strategies */
function getSubjectGuidance(subject: string): string {
  switch (subject.toLowerCase()) {
    case "math":
      return `
MATH-SPECIFIC RULES:
- Show EVERY algebraic step. Never say "simplifying, we get..." — show the actual simplification.
- Use number lines for integers, fractions, and rational numbers.
- Draw geometric figures using ASCII art for Lines, Angles, Triangles, Mensuration.
- Include "verify your answer" steps: plug the answer back in to check.
- For word problems: first extract the given data, then identify what to find, then solve.
- Use ₹ (Indian Rupees) in money problems, km/hr for speed, kg for weight.
- Relate to student life: pocket money, cricket scores, classroom measurements, train journeys.`;

    case "physics":
      return `
PHYSICS-SPECIFIC RULES:
- Always start with the REAL-WORLD PHENOMENON before the formula.
- Include a "What happens in real life?" section for every concept.
- Draw circuit diagrams, ray diagrams, and force diagrams using ASCII art.
- Show units at every step of calculation. Circle/highlight the final unit.
- Use analogies: electric current = water flowing, heat = energy on the move.
- Include "Experiment at Home" boxes: simple activities students can do to see the concept.
- For formulas: show dimensional analysis to help students remember.
- Relate to Indian context: ISRO missions, Indian Railways, monsoon weather patterns.`;

    case "chemistry":
      return `
CHEMISTRY-SPECIFIC RULES:
- Always show the molecular/atomic level: what's happening to the atoms?
- Use before/after comparisons for chemical changes vs physical changes.
- Draw simple molecular diagrams using ASCII art (H-O-H for water, etc.)
- Include "Kitchen Chemistry" examples students can relate to (cooking, rusting, curd formation).
- For reactions: show reactants → products with clear balancing steps.
- Use periodic table references with memory tricks for element positions.
- Highlight safety warnings where relevant (acids, bases, heating).
- Connect to everyday Indian life: water purification, food preservation, festival fireworks.`;

    default:
      return "";
  }
}

/** Level-specific complexity guidance */
function getLevelGuidance(level: number): string {
  const guides: Record<number, string> = {
    1: `LEVEL 1 — FUNDAMENTALS:
- Teach from absolute scratch. Assume the student knows NOTHING about this topic.
- Use the simplest possible language (age 12-13).
- Every concept needs a concrete, physical analogy.
- Examples should use single-digit or small numbers.
- Focus on building intuition, not formulas.
- Include "Think of it this way..." boxes for every key concept.`,
    2: `LEVEL 2 — BUILDING BLOCKS:
- Student has basic awareness. Now introduce formal definitions and first formulas.
- Examples use moderate numbers. Include one multi-step problem.
- Start connecting this topic to previously learned topics.
- Add "Did You Know?" facts to maintain interest.
- Include comparison tables between similar concepts.`,
    3: `LEVEL 3 — INTERMEDIATE:
- Student is comfortable with basics. Push toward exam-style problems.
- Include NCERT-style textbook problems with full solutions.
- Add "Shortcut" boxes for competitive exam tricks.
- Problems should combine 2-3 concepts in one question.
- Include a "Common Exam Pattern" section showing how this topic appears in tests.`,
    4: `LEVEL 4 — ADVANCED:
- Prepare for competitive exams (Olympiad preliminary level).
- Problems should require creative thinking and multi-step reasoning.
- Include problems that seem tricky but have elegant solutions.
- Add "Higher-Order Thinking" questions.
- Connect to real-world applications: engineering, science, technology.`,
    5: `LEVEL 5 — COMPETITION LEVEL:
- Olympiad and NTSE level preparation.
- Include problems from past Olympiad papers (or similar style).
- Focus on non-obvious problem-solving strategies.
- Problems should require combining knowledge from multiple topics.
- Add "Problem-Solving Strategy" boxes: How to approach unfamiliar problems.`,
    6: `LEVEL 6 — MASTERY / NATIONAL OLYMPIAD:
- Highest difficulty. JEE Foundation and National Olympiad level.
- Include proof-based questions and derivations where applicable.
- Problems should be genuinely challenging even for advanced students.
- Focus on deep conceptual understanding, not just calculation.
- Include "Why does this work?" discussions for every formula and method.`,
  };
  return guides[level] || guides[1];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify admin role
    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader || "" } },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roleData } = await userClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { topics, overwrite } = await req.json();

    if (!topics || !Array.isArray(topics) || topics.length === 0) {
      return new Response(
        JSON.stringify({ error: "Topics array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
    const results: Array<{ topic: string; subject: string; grade: number; level: number; status: string; error?: string }> = [];

    for (const item of topics) {
      const { topic, subject, grade = 7, level = 1 } = item;

      if (!topic || !subject) {
        results.push({ topic: topic || "?", subject: subject || "?", grade, level, status: "skipped", error: "Missing topic or subject" });
        continue;
      }

      // Check if lesson already exists
      if (!overwrite) {
        const { data: existing } = await serviceClient
          .from("lessons")
          .select("id")
          .eq("topic_name", topic)
          .eq("subject", subject)
          .eq("grade", grade)
          .eq("level", level)
          .maybeSingle();

        if (existing) {
          results.push({ topic, subject, grade, level, status: "exists" });
          continue;
        }
      }

      const topicFormatted = topic.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase());
      const subjectFormatted = subject.charAt(0).toUpperCase() + subject.slice(1);
      const gradeText = `Class ${grade}`;
      const levelText = `Level ${level}`;
      const subjectGuidance = getSubjectGuidance(subject);
      const levelGuidance = getLevelGuidance(level);

      const systemPrompt = `You are a world-class ${subjectFormatted} tutor who has taught thousands of Indian ${gradeText} students. Your lessons have helped students score in the top 1% of Olympiads, NTSE, and JEE Foundation exams. Your teaching is inspired by Khan Academy's warmth, 3Blue1Brown's visual intuition, and Feynman's ability to make complex ideas simple.

IDENTITY:
- You are "SciMath Wizard" — a friendly, brilliant tutor who makes ${subjectFormatted} exciting.
- You believe EVERY student can master any topic with the right explanation.
- You never skip steps. You never assume understanding. You build from ground up.

FORMATTING RULES:
- Use markdown: ## headers, **bold**, *italic*, bullet points, numbered lists.
- Use LaTeX: $...$ for inline math, $$...$$ for display math.
- Every section MUST include visual aids from the list below.

VISUAL AIDS (use ALL of these throughout):

1. 📐 **Formula Cards** — Wrap key formulas in blockquotes:
> 📐 **Formula:** [Name]
> $$formula$$
> *Memory trick or derivation hint*

2. 🔑 **Key Idea Boxes** — For critical concepts:
> 🔑 **Key Idea:** [concept in one powerful sentence]

3. **Step N →** Markers — For worked examples:
**Step 1 →** [what we do first]
**Step 2 →** [next step with calculation]

4. 📊 **Comparison Tables** — Use markdown tables to compare:
| Concept A | Concept B |
|-----------|-----------|

5. 📏 **ASCII Diagrams** — Inside \`\`\`diagram code blocks:
\`\`\`diagram
[visual representation]
\`\`\`

6. ❌/✅ **Mistake Boxes**:
> ❌ **Wrong:** [common mistake]
> ✅ **Correct:** [right approach]

7. 🎯 **Answer Highlights**:
> 🎯 **Answer:** [final answer clearly stated]

${subjectGuidance}

${levelGuidance}`;

      const userPrompt = `Create the DEFINITIVE guided lesson for "${topicFormatted}" in ${subjectFormatted} for ${gradeText} at ${levelText}.

This lesson will be THE primary learning resource for students. Make it comprehensive, visual, and unforgettable.

STRUCTURE (use these EXACT headers):

## 🧠 What You Need to Know

Teach the 3-4 most important concepts for this topic at this level. For EACH concept:
- Start with a relatable real-world scenario or story
- Give the formal definition in a 🔑 **Key Idea** box
- Show the formula in a 📐 **Formula** card (if applicable)
- Include an ASCII diagram in a \`\`\`diagram\`\`\` block if it helps visualize
- Add a comparison table if there are related/confusing concepts
- End with a "Think of it like..." analogy

## 🔍 Let's Work Through Examples

Solve 4 problems with COMPLETE step-by-step work:
1. **Warm-Up** — Very basic, builds confidence
2. **Textbook Level** — Standard NCERT-style problem
3. **Exam Ready** — Competition/exam-level difficulty
4. **Brain Teaser** — Makes them think creatively

For EACH problem:
- State the problem clearly in a blockquote
- Show a \`\`\`diagram\`\`\` if the problem is visual
- Use **Step N →** for EVERY step (minimum 4-5 steps per problem)
- Show ALL arithmetic — never skip a calculation
- Highlight the answer: > 🎯 **Answer:** ...
- Add a "Why this works" note explaining the underlying logic
- Add a "Quick Check" to verify the answer

## ⚠️ Common Mistakes to Avoid

List 4-5 specific mistakes students make. For each:
- > ❌ **Wrong:** [show the exact wrong approach with numbers]
- Explain WHY it's wrong (the misconception behind it)
- > ✅ **Correct:** [show the right approach]
- 🔑 **Key Idea** box with a memory trick to avoid this mistake

## 💡 Quick Tips & Tricks

5-6 exam shortcuts and mental math tricks:
- Each in a 📐 **Formula** card
- Include when to use each trick
- Add a master comparison table of all formulas/tricks for this topic
- Include pattern-recognition tips for identifying problem types

## 🎯 Ready to Practice?

- Brief encouraging recap of what they learned
- A "Challenge Yourself" question (don't solve it — let them try)
- A motivational note connecting this topic to future learning

IMPORTANT: This lesson should be 2000-3000 words. Be thorough. Every explanation should have a visual aid. Make this the lesson that makes the student say "NOW I get it!"`;

      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${GEMINI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gemini-2.5-flash",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            stream: false,
            temperature: 0.7,
            max_tokens: 8000,
          }),
        });

        if (!response.ok) {
          const status = response.status;
          results.push({ topic, subject, grade, level, status: "error", error: `AI error ${status}` });
          if (status === 429) {
            results.push({ topic: "RATE_LIMITED", subject: "", grade: 0, level: 0, status: "error", error: "Rate limited. Try again later." });
            break;
          }
          if (status === 402) {
            results.push({ topic: "CREDITS_EXHAUSTED", subject: "", grade: 0, level: 0, status: "error", error: "AI credits exhausted." });
            break;
          }
          continue;
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;

        if (!content || content.length < 200) {
          results.push({ topic, subject, grade, level, status: "error", error: "AI response too short" });
          continue;
        }

        const { error: upsertError } = await serviceClient
          .from("lessons")
          .upsert(
            {
              topic_name: topic,
              subject: subject.toLowerCase(),
              grade,
              level,
              content,
              generated_by: "bulk_ai_v2",
              updated_at: new Date().toISOString(),
            },
            { onConflict: "topic_name,subject,grade,level" }
          );

        if (upsertError) {
          results.push({ topic, subject, grade, level, status: "error", error: upsertError.message });
        } else {
          results.push({ topic, subject, grade, level, status: "generated" });
          console.log(`✅ Generated: ${subject}/${topic} L${level}`);
        }

        // Delay to respect rate limits
        await new Promise(r => setTimeout(r, 2000));
      } catch (e) {
        results.push({ topic, subject, grade, level, status: "error", error: (e as Error).message });
      }
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-lesson-bulk error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
