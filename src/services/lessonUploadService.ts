/**
 * Lesson upload/download service for CSV-based lesson management
 */
import { supabase } from "@/integrations/supabase/client";

export interface LessonRow {
  topic_name: string;
  subject: string;
  grade: number;
  level: number;
  content: string;
}

/**
 * Parse a CSV/TSV file containing lessons.
 * Expected columns: topic_name, subject, grade, level, content
 * Content may be multi-line (enclosed in double quotes).
 */
export function parseLessonCSV(raw: string): LessonRow[] {
  const results: LessonRow[] = [];

  // Detect delimiter
  const firstLine = raw.split('\n')[0] || '';
  const delimiter = firstLine.includes('\t') ? '\t' : ',';

  // Parse with quote handling for multi-line content
  const rows = parseCSVWithQuotes(raw, delimiter);

  if (rows.length < 2) return results;

  // Find column indices from header
  const header = rows[0].map(h => h.trim().toLowerCase().replace(/[^a-z_]/g, ''));
  const topicIdx = header.findIndex(h => h === 'topic_name' || h === 'topic');
  const subjectIdx = header.findIndex(h => h === 'subject');
  const gradeIdx = header.findIndex(h => h === 'grade');
  const levelIdx = header.findIndex(h => h === 'level');
  const contentIdx = header.findIndex(h => h === 'content');

  if (topicIdx === -1 || contentIdx === -1) {
    console.error('Lesson CSV missing required columns: topic_name, content. Found:', header);
    return results;
  }

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length <= contentIdx) continue;

    const topic_name = row[topicIdx]?.trim();
    const content = row[contentIdx]?.trim();
    if (!topic_name || !content || content.length < 50) continue;

    results.push({
      topic_name,
      subject: (row[subjectIdx]?.trim() || 'math').toLowerCase(),
      grade: parseInt(row[gradeIdx]?.trim() || '7') || 7,
      level: parseInt(row[levelIdx]?.trim() || '1') || 1,
      content,
    });
  }

  return results;
}

/** CSV parser that handles quoted fields with newlines */
function parseCSVWithQuotes(raw: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let current: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < raw.length; i++) {
    const c = raw[i];

    if (inQuotes) {
      if (c === '"') {
        if (i + 1 < raw.length && raw[i + 1] === '"') {
          field += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === delimiter) {
        current.push(field);
        field = '';
      } else if (c === '\n' || (c === '\r' && raw[i + 1] === '\n')) {
        current.push(field);
        field = '';
        if (current.some(f => f.trim())) rows.push(current);
        current = [];
        if (c === '\r') i++; // skip \n after \r
      } else {
        field += c;
      }
    }
  }

  // Last field/row
  current.push(field);
  if (current.some(f => f.trim())) rows.push(current);

  return rows;
}

/**
 * Upload parsed lessons to the database (upsert)
 */
export async function uploadLessons(
  lessons: LessonRow[],
  overwrite: boolean = true
): Promise<{ inserted: number; skipped: number; errors: string[] }> {
  let inserted = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const lesson of lessons) {
    try {
      if (!overwrite) {
        // Check if exists
        const { data: existing } = await supabase
          .from('lessons')
          .select('id')
          .eq('topic_name', lesson.topic_name)
          .eq('subject', lesson.subject)
          .eq('grade', lesson.grade)
          .eq('level', lesson.level)
          .maybeSingle();

        if (existing) {
          skipped++;
          continue;
        }
      }

      const { error } = await supabase.from('lessons').upsert(
        {
          topic_name: lesson.topic_name,
          subject: lesson.subject,
          grade: lesson.grade,
          level: lesson.level,
          content: lesson.content,
          generated_by: 'csv_upload',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'topic_name,subject,grade,level' }
      );

      if (error) {
        errors.push(`${lesson.topic_name} L${lesson.level}: ${error.message}`);
      } else {
        inserted++;
      }
    } catch (e) {
      errors.push(`${lesson.topic_name} L${lesson.level}: ${(e as Error).message}`);
    }
  }

  return { inserted, skipped, errors };
}

/**
 * Download all lessons as CSV string
 */
export async function downloadLessonsAsCSV(): Promise<string> {
  const { data, error } = await supabase
    .from('lessons')
    .select('topic_name, subject, grade, level, content')
    .order('subject')
    .order('topic_name')
    .order('level');

  if (error || !data) throw new Error(error?.message || 'Failed to fetch lessons');

  // Build CSV with quoted content field
  const header = 'topic_name,subject,grade,level,content';
  const rows = data.map(row => {
    const escapedContent = '"' + ((row as any).content || '').replace(/"/g, '""') + '"';
    return `${(row as any).topic_name},${(row as any).subject},${(row as any).grade},${(row as any).level},${escapedContent}`;
  });

  return [header, ...rows].join('\n');
}

/**
 * Get lesson inventory summary
 */
export async function getLessonInventory(): Promise<
  Array<{ subject: string; topic_name: string; levels: number[]; total_length: number }>
> {
  const { data, error } = await supabase
    .from('lessons')
    .select('topic_name, subject, level, content')
    .order('subject')
    .order('topic_name')
    .order('level');

  if (error || !data) return [];

  const map = new Map<string, { subject: string; topic_name: string; levels: number[]; total_length: number }>();

  for (const row of data) {
    const r = row as any;
    const key = `${r.subject}::${r.topic_name}`;
    if (!map.has(key)) {
      map.set(key, { subject: r.subject, topic_name: r.topic_name, levels: [], total_length: 0 });
    }
    const entry = map.get(key)!;
    entry.levels.push(r.level);
    entry.total_length += (r.content || '').length;
  }

  return Array.from(map.values());
}

/**
 * Generate the example CSV template content
 */
export function generateLessonTemplate(): string {
  return `topic_name,subject,grade,level,content
Physical and Chemical Changes,chemistry,7,1,"## 🧠 What You Need to Know

### 1. What is a Change?

Everything around us is constantly changing! When you heat water, it boils. When you leave iron in the rain, it rusts. But are these changes the same? **No!** Let's find out why.

> 🔑 **Key Idea:** A **change** is any alteration in the properties of a substance — its size, shape, colour, state, or composition.

### 2. Physical Changes

A **physical change** is a change where **no new substance is formed**. The substance may look different, but it's still the same material.

**Examples:**
- Ice melting → Water (still H₂O!)
- Tearing paper → Smaller paper (still paper!)
- Dissolving sugar in water → Sugar solution (evaporate and you get sugar back!)

> 📐 **Formula Card:**
> **Physical Change** = Change in appearance/state, **NOT** in chemical composition
> *Memory trick: Physical = Reversible (mostly)*

\`\`\`diagram
    ICE  ──heat──►  WATER  ──heat──►  STEAM
   (solid)         (liquid)          (gas)
     ◄──cool──       ◄──cool──
        ALL ARE H₂O — same substance!
\`\`\`

### 3. Chemical Changes

A **chemical change** is a change where **one or more new substances are formed**. The original substance is gone forever!

**Examples:**
- Burning paper → Ash + CO₂ (you can't get paper back!)
- Cooking an egg → Cooked egg (you can't uncook it!)
- Rusting of iron → Iron oxide (a completely different substance!)

> 🔑 **Key Idea:** In a chemical change, the **chemical composition** of the substance changes. New bonds form, old bonds break.

### 4. How to Tell the Difference?

| Feature | Physical Change | Chemical Change |
|---------|----------------|-----------------|
| New substance? | ❌ No | ✅ Yes |
| Reversible? | Usually yes | Usually no |
| Energy change? | Small | Often large |
| Colour change? | Rare | Common |
| Gas/smell? | Rare | Common |

---

## 🔍 Let's Work Through Examples

### 🟢 Warm-Up: Is it physical or chemical?

**Problem:** You dissolve salt in water. Is this a physical change or chemical change?

**Step 1 →** Check: Is a new substance formed? Salt water contains Na⁺ and Cl⁻ ions — the same particles as in salt.

**Step 2 →** Check: Can we reverse it? Yes! Evaporate the water and you get salt crystals back.

**Step 3 →** Conclusion: Since no new substance is formed and it's reversible...

> 🎯 **Answer:** Dissolving salt is a **physical change**.

### 📘 Textbook: Burning a candle

**Problem:** When a candle burns, both physical and chemical changes happen. Identify them.

**Step 1 →** The wax near the flame melts (solid → liquid). This is a **physical change** — still wax!

**Step 2 →** The melted wax travels up the wick and vaporizes. Physical change again.

**Step 3 →** The wax vapour burns in the flame: wax + O₂ → CO₂ + H₂O + heat + light

**Step 4 →** New substances (CO₂ and water) are formed. This is a **chemical change**!

> 🎯 **Answer:** Melting of wax = Physical change. Burning of wax = Chemical change. A candle shows **both** types!

---

## ⚠️ Common Mistakes to Avoid

> ❌ **Wrong:** ""Dissolving is always a chemical change because the substance disappears""
> ✅ **Correct:** Dissolving is usually a **physical** change. The substance is still there — just spread out in the solvent!
> 🔑 *If you can get it back by evaporation, it's physical.*

> ❌ **Wrong:** ""All changes that produce heat are chemical changes""
> ✅ **Correct:** Rubbing your hands produces heat but no new substance — it's a **physical** change!

> ❌ **Wrong:** ""Cutting and tearing are chemical changes because the shape changes""
> ✅ **Correct:** Shape change alone is **physical**. The paper/wood is still the same substance!

---

## 💡 Quick Tips & Tricks

> 📐 **The NEW Substance Test:**
> Ask yourself: ""Is there a NEW substance that wasn't there before?""
> YES → Chemical change | NO → Physical change

> 📐 **The Reverse Test:**
> Can I easily reverse this change?
> YES → Likely physical | NO → Likely chemical

| Keyword | Type |
|---------|------|
| Melting, Freezing, Boiling | Physical |
| Burning, Rusting, Cooking | Chemical |
| Dissolving, Mixing | Usually Physical |
| Rotting, Fermenting | Chemical |

---

## 🎯 Ready to Practice?

**Key Takeaways:**
1. **Physical change** = No new substance. Usually reversible. Same composition.
2. **Chemical change** = New substance formed. Usually irreversible. New composition.
3. Look for signs: colour change, gas release, temperature change, precipitate.

**Challenge Question:** 🧪
When you add lemon juice to baking soda, it fizzes and bubbles form. Is this a physical or chemical change? Why?

*Hint: What is the gas being produced? Can you get the baking soda back?*

You've got this! Understanding physical vs chemical changes is the foundation of all chemistry. 🌟"`;
}
