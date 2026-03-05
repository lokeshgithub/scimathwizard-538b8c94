/**
 * Topic prerequisite graph data.
 *
 * Each entry maps a topic keyword pattern to the patterns it depends on.
 * Keywords are matched against topic names (lowercased, underscores→spaces).
 * A topic is considered "locked" until all its prerequisites are mastered (any level).
 *
 * These are curated learning-path dependencies, not exhaustive taxonomies.
 */

export interface PrereqEdge {
  /** Keyword pattern that matches the dependent topic */
  topic: string;
  /** Keyword patterns the topic depends on (all must be mastered) */
  requires: string[];
}

// ── Math Prerequisites ──────────────────────────────────────────────
export const MATH_PREREQS: PrereqEdge[] = [
  { topic: 'decimal', requires: ['fraction'] },
  { topic: 'percent', requires: ['fraction', 'decimal'] },
  { topic: 'rational', requires: ['integer', 'fraction'] },
  { topic: 'exponent', requires: ['integer'] },
  { topic: 'ratio', requires: ['fraction'] },
  { topic: 'proportion', requires: ['ratio'] },
  { topic: 'profit', requires: ['percent'] },
  { topic: 'loss', requires: ['percent'] },
  { topic: 'interest', requires: ['percent'] },
  { topic: 'linear', requires: ['algebra'] },
  { topic: 'quadratic', requires: ['linear', 'exponent'] },
  { topic: 'polynomial', requires: ['algebra', 'exponent'] },
  { topic: 'area', requires: ['geometry'] },
  { topic: 'perimeter', requires: ['geometry'] },
  { topic: 'volume', requires: ['area'] },
  { topic: 'surface', requires: ['area'] },
  { topic: 'circle', requires: ['geometry'] },
  { topic: 'triangle', requires: ['geometry', 'angle'] },
  { topic: 'probability', requires: ['fraction'] },
  { topic: 'statistic', requires: ['decimal'] },
];

// ── Physics Prerequisites ───────────────────────────────────────────
export const PHYSICS_PREREQS: PrereqEdge[] = [
  { topic: 'velocity', requires: ['motion'] },
  { topic: 'acceleration', requires: ['velocity'] },
  { topic: 'force', requires: ['motion'] },
  { topic: 'friction', requires: ['force'] },
  { topic: 'gravity', requires: ['force'] },
  { topic: 'momentum', requires: ['force', 'velocity'] },
  { topic: 'energy', requires: ['work'] },
  { topic: 'kinetic', requires: ['energy', 'velocity'] },
  { topic: 'potential', requires: ['energy'] },
  { topic: 'reflection', requires: ['light'] },
  { topic: 'refraction', requires: ['light'] },
  { topic: 'lens', requires: ['refraction'] },
  { topic: 'circuit', requires: ['electric'] },
  { topic: 'resistance', requires: ['circuit'] },
];

// ── Chemistry Prerequisites ─────────────────────────────────────────
export const CHEMISTRY_PREREQS: PrereqEdge[] = [
  { topic: 'element', requires: ['atom'] },
  { topic: 'compound', requires: ['element'] },
  { topic: 'molecule', requires: ['element'] },
  { topic: 'mixture', requires: ['compound'] },
  { topic: 'reaction', requires: ['compound'] },
  { topic: 'acid', requires: ['reaction'] },
  { topic: 'base', requires: ['reaction'] },
  { topic: 'salt', requires: ['acid', 'base'] },
  { topic: 'metal', requires: ['element'] },
];

/**
 * Get prerequisite edges for a subject.
 */
export function getPrereqsForSubject(subject: string): PrereqEdge[] {
  switch (subject.toLowerCase()) {
    case 'physics':
      return PHYSICS_PREREQS;
    case 'chemistry':
      return CHEMISTRY_PREREQS;
    case 'math':
    default:
      return MATH_PREREQS;
  }
}

/**
 * Given actual topic names and a subject, resolve which real topics are
 * prerequisites for a given real topic.
 *
 * Returns an array of matching topic names (from `allTopics`) that are
 * prerequisites.
 */
export function resolvePrerequisites(
  topicName: string,
  allTopics: string[],
  subject: string,
): string[] {
  const edges = getPrereqsForSubject(subject);
  const cleaned = topicName.toLowerCase().replace(/[_-]/g, ' ');

  // Find matching edges — a topic can match multiple prerequisite rules
  const matchingEdges = edges.filter((e) => cleaned.includes(e.topic));
  if (matchingEdges.length === 0) return [];

  // Collect all required keyword patterns
  const requiredPatterns = new Set<string>();
  for (const edge of matchingEdges) {
    for (const req of edge.requires) {
      requiredPatterns.add(req);
    }
  }

  // Map each required pattern to the best-matching real topic
  const prerequisites: string[] = [];
  for (const pattern of requiredPatterns) {
    const match = allTopics.find((t) =>
      t.toLowerCase().replace(/[_-]/g, ' ').includes(pattern),
    );
    if (match && match !== topicName) {
      prerequisites.push(match);
    }
  }

  return [...new Set(prerequisites)];
}
