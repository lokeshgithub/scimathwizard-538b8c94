import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ValidateRequest {
  questionId: string;
  selectedAnswer: number; // 0=A, 1=B, 2=C, 3=D
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { questionId, selectedAnswer } = await req.json() as ValidateRequest;

    console.log(`Validating answer for question ${questionId}, selected: ${selectedAnswer}`);

    if (!questionId || selectedAnswer === undefined || selectedAnswer === null) {
      return new Response(
        JSON.stringify({ error: 'Missing questionId or selectedAnswer' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role to access correct_answer
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch the question with correct answer (only service role can see this)
    const { data: question, error } = await supabase
      .from('questions')
      .select('correct_answer, explanation')
      .eq('id', questionId)
      .single();

    if (error || !question) {
      console.error('Error fetching question:', error);
      return new Response(
        JSON.stringify({ error: 'Question not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Convert A/B/C/D to 0/1/2/3
    const correctIndex = question.correct_answer.toUpperCase().charCodeAt(0) - 65;
    const isCorrect = selectedAnswer === correctIndex;

    console.log(`Question ${questionId}: correct=${correctIndex}, selected=${selectedAnswer}, isCorrect=${isCorrect}`);

    return new Response(
      JSON.stringify({
        isCorrect,
        correctIndex,
        explanation: question.explanation || '',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error validating answer:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});