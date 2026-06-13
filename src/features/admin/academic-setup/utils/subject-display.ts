import type { Subject } from '@/types/class';

export type SubjectLevelRef = {
  id: number;
  name: string;
  code?: string | null;
};

export type SubjectScopeLabelKey =
  | 'admin.academicSetup.subjectScopePrimary'
  | 'admin.academicSetup.subjectScopeMiddle';

export function countSubjectsByName(subjects: Subject[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const subject of subjects) {
    const name = subject.name?.trim() ?? '';
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return counts;
}

export function subjectNeedsDistinctLabel(subject: Subject, nameCounts: Map<string, number>): boolean {
  const name = subject.name?.trim() ?? '';
  return (nameCounts.get(name) ?? 0) > 1;
}

function resolveSubjectLevelIds(subject: Subject): number[] {
  if (Array.isArray(subject.level_ids) && subject.level_ids.length > 0) {
    return subject.level_ids;
  }
  if (subject.level_id != null) return [subject.level_id];
  return [];
}

function levelCodesForSubject(subject: Subject, levelsById: Map<number, SubjectLevelRef>): string[] {
  return resolveSubjectLevelIds(subject)
    .map((id) => levelsById.get(id)?.code?.trim())
    .filter((code): code is string => Boolean(code));
}

function inferScopeLabelKey(codes: string[]): SubjectScopeLabelKey | null {
  if (!codes.length) return null;
  if (codes.every((code) => code.startsWith('P'))) {
    return 'admin.academicSetup.subjectScopePrimary';
  }
  if (codes.every((code) => code.startsWith('M'))) {
    return 'admin.academicSetup.subjectScopeMiddle';
  }
  return null;
}

function formatCodeRange(codes: string[]): string | null {
  if (!codes.length) return null;
  if (codes.length === 1) return codes[0];
  const sorted = [...codes].sort();
  return `${sorted[0]}…${sorted[sorted.length - 1]}`;
}

export function buildSubjectDisplayLabel(
  subject: Subject,
  levelsById: Map<number, SubjectLevelRef>,
  nameCounts: Map<string, number>,
  t: (key: SubjectScopeLabelKey) => string,
): string {
  const baseName = subject.name?.trim() || `#${subject.id}`;
  if (!subjectNeedsDistinctLabel(subject, nameCounts)) return baseName;

  const levelIds = resolveSubjectLevelIds(subject);
  if (levelIds.length === 1) {
    const level = levelsById.get(levelIds[0]);
    if (level?.code) return `${baseName} — ${level.code}`;
    if (level?.name) return `${baseName} — ${level.name}`;
  }

  const codes = levelCodesForSubject(subject, levelsById);
  const scopeKey = inferScopeLabelKey(codes);
  if (scopeKey) return `${baseName} — ${t(scopeKey)}`;

  const codeRange = formatCodeRange(codes);
  if (codeRange) return `${baseName} — ${codeRange}`;

  if (subject.code?.trim()) return `${baseName} — ${subject.code.trim()}`;

  return `${baseName} (#${subject.id})`;
}

export function buildLevelsById(levels: SubjectLevelRef[]): Map<number, SubjectLevelRef> {
  return new Map(levels.map((level) => [level.id, level]));
}

export function filterSubjectsByQuery(subjects: Subject[], query: string): Subject[] {
  const q = query.trim().toLowerCase();
  if (!q) return subjects;
  return subjects.filter((subject) => {
    const haystack = [subject.name, subject.code, String(subject.id)]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });
}
