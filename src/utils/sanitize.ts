/**
 * Strip HTML tags from a string to prevent XSS when rendering user-supplied content.
 * Allows plain text only — no HTML entities, no tags.
 */
export function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, '').trim();
}

/**
 * Sanitize all string fields in a parsed question row.
 */
export function sanitizeQuestionFields(fields: {
  question: string;
  options: string[];
  explanation: string;
}): { question: string; options: string[]; explanation: string } {
  return {
    question: stripHtml(fields.question),
    options: fields.options.map(stripHtml),
    explanation: stripHtml(fields.explanation),
  };
}
