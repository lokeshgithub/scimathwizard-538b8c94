import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
  sessionId?: string;
  userId?: string;
}

// Log usage to database (fire-and-forget)
async function logUsage(
  supabaseUrl: string,
  supabaseKey: string,
  userId: string | null,
  sessionId: string | null,
  actionType: string,
  details: Record<string, unknown>,
  estimatedCost: number = 0
) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    await supabase.from('usage_logs').insert({
      user_id: userId,
      session_id: sessionId,
      action_type: actionType,
      details,
      estimated_cost: estimatedCost,
    } as any);
  } catch (error) {
    console.error('Failed to log usage:', error);
  }
}

// UUID validation
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function isValidUUID(str: string): boolean {
  return UUID_REGEX.test(str);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

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
      sessionId,
      userId,
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

    const startTime = Date.now();
    const validUserId = userId && isValidUUID(userId) ? userId : null;
    
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

    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      // Log failed AI request (fire-and-forget)
      logUsage(
        supabaseUrl,
        supabaseServiceKey,
        validUserId,
        sessionId || null,
        'ai_analysis_failed',
        {
          subject,
          total_questions: totalQuestions,
          error_status: response.status,
          response_time_ms: responseTime,
        },
        0
      );

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
    
    // Estimate tokens used (rough estimate: ~4 chars per token)
    const promptTokens = Math.ceil(prompt.length / 4);
    const responseTokens = Math.ceil(recommendations.length / 4);
    const totalTokens = promptTokens + responseTokens;
    
    // Estimated cost for AI usage (gemini-flash is very cost-effective)
    // Rough estimate: $0.00001 per token for flash models
    const estimatedCost = totalTokens * 0.00001;

    // Log successful AI usage (fire-and-forget)
    logUsage(
      supabaseUrl,
      supabaseServiceKey,
      validUserId,
      sessionId || null,
      'ai_session_analysis',
      {
        subject,
        total_questions: totalQuestions,
        overall_accuracy: overallAccuracy,
        topics_analyzed: topicAnalyses.length,
        prompt_tokens: promptTokens,
        response_tokens: responseTokens,
        total_tokens: totalTokens,
        response_time_ms: responseTime,
        model: 'google/gemini-3-flash-preview',
      },
      estimatedCost
    );

    console.log(`AI analysis completed: ${totalTokens} tokens, ${responseTime}ms, est cost: $${estimatedCost.toFixed(6)}`);

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