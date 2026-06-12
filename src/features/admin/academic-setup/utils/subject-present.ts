import type { Subject } from '@/types/class';

/** Deduplicate subjects by id for display (preserves first occurrence order). */
export function dedupeSubjectsForDisplay(subjects: Subject[]): Subject[] {
  const seen = new Set<number>();
  const result: Subject[] = [];
  for (const subject of subjects) {
    if (seen.has(subject.id)) continue;
    seen.add(subject.id);
    result.push(subject);
  }
  return result;
}
