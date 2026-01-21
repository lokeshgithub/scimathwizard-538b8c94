import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TopicAnalysis {
  topic: string;
  questionsAttempted: number;
  correctAnswers: number;
  accuracy: number;
  averageTimeSeconds: number;
  isStrength: boolean;
  isWeakness: boolean;
}

interface AnalysisRequest {
  subject: string;
  topicAnalyses: TopicAnalysis[];
  strengths: string[];
  weaknesses: string[];
  slowTopics: string[];
  fastTopics: string[];
  overallAccuracy: number;
  totalQuestions: number;
  averageTimePerQuestion: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const body: AnalysisRequest = await req.json();
    const {
      subject,
      topicAnalyses,
      strengths,
      weaknesses,
      slowTopics,
      fastTopics,
      overallAccuracy,
      totalQuestions,
      averageTimePerQuestion,
    } = body;

    // Build a detailed prompt for the AI
    const prompt = `You are an encouraging educational tutor helping a student understand their quiz performance. Based on the following quiz session data, provide personalized learning advice.

**Subject**: ${subject}
**Total Questions Attempted**: ${totalQuestions}
**Overall Accuracy**: ${(overallAccuracy * 100).toFixed(1)}%
**Average Time Per Question**: ${averageTimePerQuestion.toFixed(1)} seconds

**Topic Performance**:
${topicAnalyses.map(t => `- ${t.topic}: ${t.correctAnswers}/${t.questionsAttempted} correct (${(t.accuracy * 100).toFixed(0)}%), avg ${t.averageTimeSeconds.toFixed(1)}s per question`).join('\n')}

**Strong Areas**: ${strengths.length > 0 ? strengths.join(', ') : 'None identified yet'}
**Areas for Improvement**: ${weaknesses.length > 0 ? weaknesses.join(', ') : 'None - great job!'}
**Topics Taking More Time**: ${slowTopics.length > 0 ? slowTopics.join(', ') : 'None - you\'re quick!'}
**Quick Topics**: ${fastTopics.length > 0 ? fastTopics.join(', ') : 'None identified'}

Please provide:
1. A brief, encouraging summary of their performance (2-3 sentences)
2. Specific advice for their weak areas (mention the topic names)
3. Tips for the topics where they took more time
4. Suggested learning resources or practice strategies
5. A motivational closing message

Format your response in a friendly, student-appropriate tone. Use emojis sparingly to keep it engaging. Keep the total response under 400 words.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { 
            role: "system", 
            content: "You are a friendly and encouraging educational tutor who helps students understand their learning progress. Be specific, actionable, and positive." 
          },
          { role: "user", content: prompt }
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI service temporarily unavailable." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const recommendations = data.choices?.[0]?.message?.content || "Keep practicing! Every question you solve makes you stronger.";

    return new Response(
      JSON.stringify({ recommendations }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating analysis:", error);
    return new Response(
      JSON.stringify({ 
        error: "Failed to generate analysis",
        recommendations: "Great job on completing your practice session! Keep reviewing your weak areas and practicing regularly. You're making progress!" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
