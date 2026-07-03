import {
  buildLevelsById,
  buildSubjectDisplayLabel,
  countSubjectsByName,
  filterSubjectsByQuery,
  type SubjectLevelRef,
} from '@/features/admin/academic-setup/utils/subject-display';
import { classSubjectSourceLabel } from '@/features/admin/academic-setup/utils/class-display';
import type { Subject } from '@/types/class';

export type SubjectTier = 'primary' | 'middle' | 'high' | 'other';

export type SubjectListGroup = {
  id: SubjectTier;
  subjects: Subject[];
};

export type SubjectRowMeta = {
  displayName: string;
  isDuplicateName: boolean;
  tier: SubjectTier;
  levelLabels: string[];
  sourceLabel: string | null;
};

const TIER_ORDER: SubjectTier[] = ['primary', 'middle', 'high', 'other'];

const CODE_TIER_RULES: { tier: SubjectTier; pattern: RegExp }[] = [
  { tier: 'primary', pattern: /_(PRIM|PRIMARY)$/i },
  { tier: 'middle', pattern: /_(MID|MID_SCHOOL)$/i },
  { tier: 'high', pattern: /_(HIGH|SEC|SECONDARY)$/i },
];

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

export function inferSubjectTier(subject: Subject, levelsById: Map<number, SubjectLevelRef>): SubjectTier {
  const code = subject.code?.trim() ?? '';
  for (const rule of CODE_TIER_RULES) {
    if (rule.pattern.test(code)) return rule.tier;
  }

  const levelCodes = levelCodesForSubject(subject, levelsById);
  if (levelCodes.length > 0) {
    if (levelCodes.every((c) => /^P/i.test(c))) return 'primary';
    if (levelCodes.every((c) => /^M/i.test(c))) return 'middle';
    if (levelCodes.every((c) => /^H/i.test(c))) return 'high';
  }

  return 'other';
}

export function resolveSubjectLevelLabels(
  subject: Subject,
  levelsById: Map<number, SubjectLevelRef>,
): string[] {
  const labels = resolveSubjectLevelIds(subject)
    .map((id) => {
      const level = levelsById.get(id);
      if (!level) return null;
      return level.name?.trim() || level.code?.trim() || null;
    })
    .filter((label): label is string => Boolean(label));

  return [...new Set(labels)];
}

export function buildSubjectRowMeta(
  subject: Subject,
  levelsById: Map<number, SubjectLevelRef>,
  nameCounts: Map<string, number>,
  t: (key: string) => string,
): SubjectRowMeta {
  const displayName = buildSubjectDisplayLabel(subject, levelsById, nameCounts, (key) => t(key));
  const name = subject.name?.trim() ?? '';
  return {
    displayName,
    isDuplicateName: (nameCounts.get(name) ?? 0) > 1,
    tier: inferSubjectTier(subject, levelsById),
    levelLabels: resolveSubjectLevelLabels(subject, levelsById),
    sourceLabel: subject.source ? classSubjectSourceLabel(t, subject.source) : null,
  };
}

export function computeSubjectsOverview(subjects: Subject[]) {
  const levelIds = new Set<number>();
  let withAssignments = 0;
  let duplicateNameGroups = 0;

  for (const subject of subjects) {
    for (const id of resolveSubjectLevelIds(subject)) levelIds.add(id);
    if ((subject.assignments_count ?? 0) > 0) withAssignments += 1;
  }
  for (const count of countSubjectsByName(subjects).values()) {
    if (count > 1) duplicateNameGroups += 1;
  }

  return {
    subjectCount: subjects.length,
    levelCount: levelIds.size,
    duplicateNameCount: duplicateNameGroups,
    withAssignmentsCount: withAssignments,
  };
}

export function filterSubjectsForList(
  subjects: Subject[],
  levelsById: Map<number, SubjectLevelRef>,
  query: string,
  tierFilter: SubjectTier | '',
): Subject[] {
  let next = filterSubjectsByQuery(subjects, query);
  if (tierFilter) {
    next = next.filter((subject) => inferSubjectTier(subject, levelsById) === tierFilter);
  }
  return next.sort((a, b) => {
    const nameCmp = (a.name ?? '').localeCompare(b.name ?? '', 'ar');
    if (nameCmp !== 0) return nameCmp;
    return (a.code ?? '').localeCompare(b.code ?? '', 'en');
  });
}

export function groupSubjectsForList(
  subjects: Subject[],
  levelsById: Map<number, SubjectLevelRef>,
): SubjectListGroup[] {
  const buckets = new Map<SubjectTier, Subject[]>();
  for (const tier of TIER_ORDER) buckets.set(tier, []);

  for (const subject of subjects) {
    const tier = inferSubjectTier(subject, levelsById);
    buckets.get(tier)?.push(subject);
  }

  return TIER_ORDER.map((tier) => ({
    id: tier,
    subjects: buckets.get(tier) ?? [],
  })).filter((group) => group.subjects.length > 0);
}

export function buildLevelsByIdFromLevels(levels: SubjectLevelRef[]): Map<number, SubjectLevelRef> {
  return buildLevelsById(levels);
}

export function subjectLevelCodes(
  subject: Subject,
  levelsById: Map<number, SubjectLevelRef>,
): string[] {
  return levelCodesForSubject(subject, levelsById);
}