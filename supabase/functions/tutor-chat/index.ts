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
    const { messages, topic, subject, grade, lessonContext } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Messages are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate message structure
    for (const msg of messages) {
      if (!msg.role || !msg.content || typeof msg.content !== "string") {
        return new Response(
          JSON.stringify({ error: "Invalid message format" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (msg.content.length > 2000) {
        return new Response(
          JSON.stringify({ error: "Message too long (max 2000 characters)" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Limit conversation history to last 20 messages
    const recentMessages = messages.slice(-20);

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const topicFormatted = (topic || "").replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase());
    const subjectFormatted = (subject || "Math").charAt(0).toUpperCase() + (subject || "math").slice(1);
    const gradeText = grade ? `Class ${grade}` : "Class 7";

    // Truncate lesson context to avoid token limits
    const lessonSnippet = lessonContext
      ? lessonContext.slice(0, 3000) + (lessonContext.length > 3000 ? "\n...(lesson continues)" : "")
      : "";

    const systemPrompt = `You are a warm, patient ${subjectFormatted} tutor helping a ${gradeText} Indian student understand "${topicFormatted}". You are inside a guided lesson page — the student has just read a lesson and is asking follow-up questions.

PERSONALITY:
- Be like a friendly older sibling who's great at ${subjectFormatted}
- Use encouraging language: "Great question!", "That's a really smart thing to notice"
- If the student is confused, break it down into even simpler steps
- Use real-world examples from Indian daily life

RULES:
- Keep answers concise (2-4 short paragraphs max) unless the student asks for more detail
- Use markdown: **bold** for key terms, bullet points for steps
- Use LaTeX math: $...$ for inline, $$...$$ for display equations
- If you don't know something, say so honestly
- Never give direct quiz answers — instead guide them to think through it
- Stay strictly on topic (${subjectFormatted} / ${topicFormatted}). Politely redirect off-topic questions.
- If the student seems frustrated, acknowledge their feeling first, then simplify your explanation

${lessonSnippet ? `LESSON CONTEXT (the student just read this):\n${lessonSnippet}` : ""}`;

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
          ...recentMessages,
        ],
        stream: true,
        temperature: 0.7,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(
          JSON.stringify({ error: "Too many questions! Take a breath and try again in a moment. 😊" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ error: "AI tutor is temporarily unavailable. Please try again later." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errText = await response.text();
      console.error("AI gateway error:", status, errText);
      return new Response(
        JSON.stringify({ error: "Couldn't reach the tutor. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("tutor-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
