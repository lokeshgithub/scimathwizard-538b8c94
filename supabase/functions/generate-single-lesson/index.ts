import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
- Draw geometric figures using ASCII art for geometry topics.
- Include "verify your answer" steps: plug the answer back in to check.
- For word problems: extract given data, identify what to find, then solve.
- Use ₹ (Indian Rupees) in money problems, km/hr for speed, kg for weight.
- Relate to student life: pocket money, cricket scores, classroom measurements, train journeys.`;
    case "physics":
      return `
PHYSICS-SPECIFIC RULES:
- Always start with the REAL-WORLD PHENOMENON before the formula.
- Include a "What happens in real life?" section for every concept.
- Draw circuit diagrams, ray diagrams, and force diagrams using ASCII art.
- Show units at every step of calculation. Highlight the final unit.
- Use analogies: electric current = water flowing, heat = energy on the move.
- Include "Experiment at Home" boxes: simple activities students can do.
- Relate to Indian context: ISRO missions, Indian Railways, monsoon weather.`;
    case "chemistry":
      return `
CHEMISTRY-SPECIFIC RULES:
- Always show the molecular/atomic level: what's happening to the atoms?
- Use before/after comparisons for chemical changes vs physical changes.
- Draw simple molecular diagrams using ASCII art (H-O-H for water, etc.)
- Include "Kitchen Chemistry" examples (cooking, rusting, curd formation).
- For reactions: show reactants → products with clear balancing steps.
- Use periodic table references with memory tricks.
- Connect to everyday Indian life: water purification, food preservation.`;
    default:
      return "";
  }
}

function getLevelGuidance(level: number): string {
  const guides: Record<number, string> = {
    1: `LEVEL 1 — FUNDAMENTALS: Teach from scratch. Simplest language. Concrete analogies. Small numbers. Build intuition, not formulas.`,
    2: `LEVEL 2 — BUILDING BLOCKS: Introduce formal definitions and first formulas. Moderate numbers. Connect to prior topics.`,
    3: `LEVEL 3 — INTERMEDIATE: Push toward exam-style problems. NCERT-style problems. Shortcuts for competitive exams. Combine 2-3 concepts.`,
    4: `LEVEL 4 — ADVANCED: Competitive exam preparation. Creative thinking. Multi-step reasoning. Real-world applications.`,
    5: `LEVEL 5 — COMPETITION: Olympiad and NTSE level. Past paper style. Non-obvious strategies. Cross-topic synthesis.`,
    6: `LEVEL 6 — MASTERY: JEE Foundation and National Olympiad level. Proofs, derivations. Deep conceptual understanding.`,
  };
  return guides[level] || guides[1];
}

function buildPrompts(topic: string, subject: string, grade: number, level: number) {
  const topicFormatted = topic.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase());
  const subjectFormatted = subject.charAt(0).toUpperCase() + subject.slice(1);
  const gradeText = `Class ${grade}`;
  const levelText = `Level ${level}`;

  const systemPrompt = `You are a world-class ${subjectFormatted} tutor for Indian ${gradeText} students. Your teaching combines Khan Academy's warmth, 3Blue1Brown's visual intuition, and Feynman's simplicity.

FORMATTING: Use markdown (## headers, **bold**, bullets). Use LaTeX ($...$ inline, $$...$$ display).

VISUAL AIDS (use ALL throughout):
1. 📐 **Formula Cards**: > 📐 **Formula:** [Name] \\n > $$formula$$ \\n > *Memory trick*
2. 🔑 **Key Idea Boxes**: > 🔑 **Key Idea:** [concept]  
3. **Step N →** for worked examples
4. Markdown comparison tables
5. \`\`\`diagram\`\`\` blocks for ASCII visuals
6. > ❌ **Wrong:** / > ✅ **Correct:** for mistakes
7. > 🎯 **Answer:** for final answers

${getSubjectGuidance(subject)}
${getLevelGuidance(level)}`;

  const userPrompt = `Create the DEFINITIVE guided lesson for "${topicFormatted}" in ${subjectFormatted} for ${gradeText} at ${levelText}.

STRUCTURE (exact headers):

## 🧠 What You Need to Know
3-4 concepts, each with: real-world scenario → 🔑 Key Idea → 📐 Formula → diagram → analogy

## 🔍 Let's Work Through Examples
4 problems (Warm-Up, Textbook, Exam Ready, Brain Teaser). Each with: clear statement → diagram → **Step N →** (4-5 steps minimum) → 🎯 Answer → "Why this works" → "Quick Check"

## ⚠️ Common Mistakes to Avoid
4-5 mistakes with: ❌ Wrong → explanation → ✅ Correct → 🔑 memory trick

## 💡 Quick Tips & Tricks
5-6 shortcuts in 📐 Formula cards + master comparison table

## 🎯 Ready to Practice?
Recap + challenge question + motivation

Target: 2000-3000 words. Every explanation needs a visual aid.`;

  return { systemPrompt, userPrompt };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { topic, subject, grade, level, secret } = await req.json();

    // Auth is handled by verify_jwt=false in config.toml
    // This function is used for internal bulk generation only
    // The admin-facing generate-lesson-bulk function has proper role-based auth

    if (!topic || !subject) {
      return new Response(JSON.stringify({ error: "topic and subject required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const serviceClient = createClient(supabaseUrl, serviceKey);

    const { systemPrompt, userPrompt } = buildPrompts(topic, subject, grade || 7, level || 1);

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
      const errText = await response.text();
      console.error(`AI error ${response.status}:`, errText);
      return new Response(JSON.stringify({ error: `AI error ${response.status}` }), {
        status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content || content.length < 200) {
      return new Response(JSON.stringify({ error: "AI response too short" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: upsertError } = await serviceClient.from("lessons").upsert(
      {
        topic_name: topic,
        subject: subject.toLowerCase(),
        grade: grade || 7,
        level: level || 1,
        content,
        generated_by: "bulk_ai_v2",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "topic_name,subject,grade,level" }
    );

    if (upsertError) {
      return new Response(JSON.stringify({ error: upsertError.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ status: "generated", topic, subject, grade, level, contentLength: content.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-single-lesson error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
