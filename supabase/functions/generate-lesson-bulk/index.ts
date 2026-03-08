import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    // Verify admin role
    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Client with user's token for auth check
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

    // Check admin role
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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Service client for DB writes
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

      const systemPrompt = `You are an expert ${subjectFormatted} tutor for Indian ${gradeText} students preparing for competitive exams (Olympiads, NTSE, JEE Foundation). Your teaching style is inspired by Khan Academy — warm, encouraging, and deeply clear.

CRITICAL RULES:
- Write for a ${gradeText} Indian student. Use simple English.
- Use real-world examples from daily Indian life (cricket scores, train problems, market shopping).
- For math: Show EVERY step. Never skip algebraic manipulation.
- Use markdown formatting with headers, bold, bullet points.
- Use LaTeX math notation with $...$ for inline and $$...$$ for display math.
- Be encouraging but never patronizing.
- End each section with a confidence-building note.

VISUAL AIDS — you MUST use these special markdown patterns:

1. **Formula Cards**: > 📐 **Formula:** ...
2. **Step-by-Step**: **Step N →** ...
3. **Key Concepts**: > 🔑 **Key Idea:** ...
4. **Comparison Tables**: markdown tables
5. **Diagrams**: \`\`\`diagram code blocks
6. **Warning Boxes**: > ❌ **Wrong:** and > ✅ **Correct:**

Use these visual aids GENEROUSLY throughout the lesson.`;

      const userPrompt = `Create a comprehensive guided lesson for "${topicFormatted}" in ${subjectFormatted} for a ${gradeText} student at ${levelText}.

Structure EXACTLY as:
## 🧠 What You Need to Know
## 🔍 Let's Work Through Examples  
## ⚠️ Common Mistakes to Avoid
## 💡 Quick Tips & Tricks
## 🎯 Ready to Practice?

Each section must include visual aids (formula cards, step breakdowns, diagrams, tables, key idea boxes). Solve 3 problems (Easy, Medium, Challenge) with full step-by-step work.`;

      try {
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
            stream: false,
            temperature: 0.7,
            max_tokens: 6000,
          }),
        });

        if (!response.ok) {
          const status = response.status;
          results.push({ topic, subject, grade, level, status: "error", error: `AI error ${status}` });
          if (status === 429) {
            // Rate limited — wait and stop
            results.push({ topic: "RATE_LIMITED", subject: "", grade: 0, level: 0, status: "error", error: "Rate limited. Try again later." });
            break;
          }
          continue;
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;

        if (!content) {
          results.push({ topic, subject, grade, level, status: "error", error: "Empty AI response" });
          continue;
        }

        // Upsert into lessons table
        const { error: upsertError } = await serviceClient
          .from("lessons")
          .upsert(
            {
              topic_name: topic,
              subject,
              grade,
              level,
              content,
              generated_by: "bulk_ai",
              updated_at: new Date().toISOString(),
            },
            { onConflict: "topic_name,subject,grade,level" }
          );

        if (upsertError) {
          results.push({ topic, subject, grade, level, status: "error", error: upsertError.message });
        } else {
          results.push({ topic, subject, grade, level, status: "generated" });
        }

        // Small delay to avoid rate limits
        await new Promise(r => setTimeout(r, 1500));
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
