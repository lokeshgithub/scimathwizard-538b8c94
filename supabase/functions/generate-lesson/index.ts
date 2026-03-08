import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { topic, subject, grade, level, weakAreas, wrongQuestions } = await req.json();

    if (!topic || !subject) {
      return new Response(
        JSON.stringify({ error: "Topic and subject are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const topicFormatted = topic.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase());
    const subjectFormatted = subject.charAt(0).toUpperCase() + subject.slice(1);
    const gradeText = grade ? `Class ${grade}` : "Class 7";
    const levelText = level ? `Level ${level}` : "current level";

    // Build context about student's specific struggles
    let studentContext = "";
    if (wrongQuestions && wrongQuestions.length > 0) {
      studentContext = `\n\nThe student got these questions wrong recently:\n${wrongQuestions
        .slice(0, 5)
        .map((q: any, i: number) => `${i + 1}. "${q.question}" — They chose "${q.studentAnswer}" but correct was "${q.correctAnswer}"`)
        .join("\n")}`;
    }
    if (weakAreas && weakAreas.length > 0) {
      studentContext += `\n\nSpecific weak areas identified: ${weakAreas.join(", ")}`;
    }

    const systemPrompt = `You are an expert ${subjectFormatted} tutor for Indian ${gradeText} students preparing for competitive exams (Olympiads, NTSE, JEE Foundation). Your teaching style is inspired by Khan Academy — warm, encouraging, and deeply clear.

CRITICAL RULES:
- Write for a ${gradeText} Indian student. Use simple English.
- Use real-world examples from daily Indian life (cricket scores, train problems, market shopping).
- For math: Show EVERY step. Never skip algebraic manipulation.
- Use markdown formatting with headers, bold, bullet points.
- Use LaTeX math notation with $...$ for inline and $$...$$ for display math.
- Be encouraging but never patronizing.
- End each section with a confidence-building note.

VISUAL AIDS — you MUST use these special markdown patterns to create visual elements:

1. **Formula Cards**: Wrap key formulas in a blockquote starting with "> 📐 **Formula:**" like this:
> 📐 **Formula:** Area of Triangle
> $$A = \\frac{1}{2} \\times base \\times height$$
> *Remember: Half the base times height!*

2. **Step-by-Step Breakdowns**: Use numbered bold headers with the arrow marker "**Step N →**" for each step:
**Step 1 →** Identify what is given
**Step 2 →** Write the formula
**Step 3 →** Substitute values

3. **Key Concept Boxes**: Use blockquotes starting with "> 🔑 **Key Idea:**" for critical concepts:
> 🔑 **Key Idea:** A negative times a negative gives a positive

4. **Comparison Tables**: Use markdown tables to compare right vs wrong approaches, or to show related formulas side by side.

5. **Visual Diagrams**: When helpful, create simple ASCII/text diagrams using code blocks labeled \`\`\`diagram. Example:
\`\`\`diagram
    A ———— B
    |      |
    |      |   Rectangle: length = 5, width = 3
    |      |
    D ———— C
\`\`\`

6. **Warning Boxes**: Use blockquotes starting with "> ❌ **Wrong:**" and "> ✅ **Correct:**" for common mistakes.

Use these visual aids GENEROUSLY throughout the lesson. Every section should have at least 1-2 visual elements.`;

    const userPrompt = `Create a comprehensive guided lesson for the topic "${topicFormatted}" in ${subjectFormatted} for a ${gradeText} student who is struggling at ${levelText}.${studentContext}

Structure the lesson EXACTLY as follows (use these exact headers):

## 🧠 What You Need to Know

Explain the 2-3 most important concepts for this topic. Use analogies. Make abstract ideas concrete. Each concept MUST include:
- A 🔑 **Key Idea** box with the core concept
- A 📐 **Formula** card (if applicable)
- A real-world analogy
- A comparison table if there are related concepts

## 🔍 Let's Work Through Examples

Solve 3 problems step-by-step, increasing in difficulty:
1. **Easy** — A warm-up problem with very detailed steps
2. **Medium** — A typical exam-level problem
3. **Challenge** — A tricky problem that tests deeper understanding

For EACH problem:
- State the problem in a clear blockquote
- Use **Step N →** format for EVERY step (show your work visually)
- Include a \`\`\`diagram\`\`\` block if the problem involves shapes, number lines, or visual reasoning
- Highlight the final answer with: > 🎯 **Answer:** ...
- Add a "Why this works" note

## ⚠️ Common Mistakes to Avoid

List 3-4 specific mistakes students make on this topic. For each:
- Use > ❌ **Wrong:** to show the incorrect approach
- Explain WHY it's wrong
- Use > ✅ **Correct:** to show the right approach
- Give a memory trick in a 🔑 **Key Idea** box

## 💡 Quick Tips & Tricks

Share 3-4 exam shortcuts using 📐 **Formula** cards. Include:
- Mental math tricks
- Pattern-recognition tips
- Shortcut formulas in formula cards
- A comparison table of when to use which formula/trick

## 🎯 Ready to Practice?

Write a brief encouraging message. Mention that they now have the tools to tackle ${levelText} problems. Include one "challenge yourself" question in a blockquote (don't solve it).`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        stream: true,
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(
          JSON.stringify({ error: "Too many requests. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ error: "AI service credits exhausted. Please try again later." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errText = await response.text();
      console.error("AI gateway error:", status, errText);
      return new Response(
        JSON.stringify({ error: "Failed to generate lesson" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Stream the response back
    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("generate-lesson error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
