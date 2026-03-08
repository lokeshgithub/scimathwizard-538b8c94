/**
 * Lesson generation service — DB-first with AI fallback + caching
 */

import { supabase } from "@/integrations/supabase/client";

const LESSON_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-lesson`;

export interface LessonRequest {
  topic: string;
  subject: string;
  grade?: number;
  level?: number;
  weakAreas?: string[];
  wrongQuestions?: Array<{
    question: string;
    studentAnswer: string;
    correctAnswer: string;
  }>;
}

/** Check DB for a cached lesson */
export async function fetchCachedLesson(
  topic: string,
  subject: string,
  grade: number,
  level: number
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from("lessons" as any)
      .select("content")
      .eq("topic_name", topic)
      .eq("subject", subject)
      .eq("grade", grade)
      .eq("level", level)
      .maybeSingle();

    if (error || !data) return null;
    return (data as any).content as string;
  } catch {
    return null;
  }
}

/** Save a generated lesson to DB for future use (fire-and-forget) */
export function cacheLessonInDB(
  topic: string,
  subject: string,
  grade: number,
  level: number,
  content: string
) {
  // Use edge function to cache since service role is needed
  fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-lesson`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ topic, subject, grade, level, content }),
  }).catch(() => { /* silent fail for caching */ });
}

export async function streamLesson({
  request,
  onDelta,
  onDone,
  onError,
  signal,
}: {
  request: LessonRequest;
  onDelta: (text: string) => void;
  onDone: () => void;
  onError: (error: string) => void;
  signal?: AbortSignal;
}) {
  try {
    const resp = await fetch(LESSON_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify(request),
      signal,
    });

    if (!resp.ok) {
      const errorData = await resp.json().catch(() => ({ error: "Failed to generate lesson" }));
      onError(errorData.error || `Request failed (${resp.status})`);
      return;
    }

    if (!resp.body) {
      onError("No response stream");
      return;
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = "";
    let streamDone = false;

    while (!streamDone) {
      const { done, value } = await reader.read();
      if (done) break;
      textBuffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);

        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") {
          streamDone = true;
          break;
        }

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) onDelta(content);
        } catch {
          textBuffer = line + "\n" + textBuffer;
          break;
        }
      }
    }

    // Final flush
    if (textBuffer.trim()) {
      for (let raw of textBuffer.split("\n")) {
        if (!raw) continue;
        if (raw.endsWith("\r")) raw = raw.slice(0, -1);
        if (raw.startsWith(":") || raw.trim() === "") continue;
        if (!raw.startsWith("data: ")) continue;
        const jsonStr = raw.slice(6).trim();
        if (jsonStr === "[DONE]") continue;
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) onDelta(content);
        } catch { /* ignore */ }
      }
    }

    onDone();
  } catch (e) {
    if ((e as Error).name === "AbortError") return;
    console.error("Lesson stream error:", e);
    onError(e instanceof Error ? e.message : "Failed to generate lesson");
  }
}
