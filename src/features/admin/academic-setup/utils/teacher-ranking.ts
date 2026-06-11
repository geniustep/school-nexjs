import type { SchoolClass } from '@/types/class';
import type { Teacher } from '@/types/teacher';
import type { TeacherSuggestion, TeacherSuggestionTier } from '../types';

const HIGH_LOAD_CLASS_THRESHOLD = 6;

function tierRank(tier: TeacherSuggestionTier): number {
  const order: TeacherSuggestionTier[] = [
    'best',
    'suitable',
    'review',
    'not_recommended',
    'ineligible',
  ];
  return order.indexOf(tier);
}

/**
 * Rank teachers for a class+subject pair using transparent rules (no AI).
 * Uses class.teachers + teacher.subjects from existing API payloads.
 */
export function rankTeachersForAssignment(
  cls: SchoolClass,
  subjectId: number,
  teachers: Teacher[],
  t: (key: string, params?: Record<string, string | number>) => string,
): TeacherSuggestion[] {
  const classTeacherIds = new Set((cls.teachers ?? []).map((x) => x.id));
  const suggestions: TeacherSuggestion[] = [];

  for (const teacher of teachers) {
    if (teacher.status !== 'active') {
      suggestions.push({
        teacher,
        tier: 'ineligible',
        reasons: [t('admin.academicSetup.suggest.inactiveAccount')],
        classCount: teacher.classes?.length ?? 0,
        teachesSubject: false,
        inClass: classTeacherIds.has(teacher.id),
      });
      continue;
    }

    const teachesSubject = teacher.subjects?.some((s) => s.id === subjectId) ?? false;
    const inClass = classTeacherIds.has(teacher.id);
    const classCount = teacher.classes?.length ?? 0;
    const reasons: string[] = [];
    let tier: TeacherSuggestionTier = 'review';

    if (!teachesSubject) {
      tier = 'ineligible';
      reasons.push(t('admin.academicSetup.suggest.notQualifiedSubject'));
    } else if (classCount >= HIGH_LOAD_CLASS_THRESHOLD) {
      tier = 'not_recommended';
      reasons.push(t('admin.academicSetup.suggest.highLoad', { count: classCount }));
    } else if (inClass) {
      tier = 'best';
      reasons.push(t('admin.academicSetup.suggest.teachesLevel'));
      reasons.push(t('admin.academicSetup.suggest.inClass'));
    } else {
      tier = 'suitable';
      reasons.push(t('admin.academicSetup.suggest.teachesSubject'));
      if (classCount >= 4) {
        tier = 'review';
        reasons.push(t('admin.academicSetup.suggest.moderateLoad', { count: classCount }));
      }
    }

    if (teachesSubject && tier === 'best') {
      reasons.unshift(t('admin.academicSetup.suggest.recommended'));
    }

    suggestions.push({
      teacher,
      tier,
      reasons,
      classCount,
      teachesSubject,
      inClass,
    });
  }

  return suggestions.sort((a, b) => {
    const tierDiff = tierRank(a.tier) - tierRank(b.tier);
    if (tierDiff !== 0) return tierDiff;
    return a.classCount - b.classCount;
  });
}

export function isHighLoadTeacher(teacher: Pick<Teacher, 'classes'>): boolean {
  return (teacher.classes?.length ?? 0) >= HIGH_LOAD_CLASS_THRESHOLD;
}
