import { supabase } from '@/integrations/supabase/client';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatHistoryKey {
  topic: string;
  subject: string;
  grade: number;
}

export async function loadChatHistory(key: ChatHistoryKey): Promise<ChatMessage[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('tutor_chat_histories')
    .select('messages')
    .eq('user_id', user.id)
    .eq('topic', key.topic)
    .eq('subject', key.subject)
    .eq('grade', key.grade)
    .maybeSingle();

  if (error || !data) return [];
  return (data.messages as unknown as ChatMessage[]) || [];
}

export async function saveChatHistory(key: ChatHistoryKey, messages: ChatMessage[]): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const row = {
    user_id: user.id,
    topic: key.topic,
    subject: key.subject,
    grade: key.grade,
    messages: messages as unknown as Record<string, unknown>[],
    updated_at: new Date().toISOString(),
  };

  // Upsert based on unique constraint
  await supabase
    .from('tutor_chat_histories')
    .upsert(row, { onConflict: 'user_id,topic,subject,grade' });
}

export async function deleteChatHistory(key: ChatHistoryKey): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from('tutor_chat_histories')
    .delete()
    .eq('user_id', user.id)
    .eq('topic', key.topic)
    .eq('subject', key.subject)
    .eq('grade', key.grade);
}
