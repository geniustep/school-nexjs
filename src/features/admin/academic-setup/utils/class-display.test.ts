import { describe, expect, it } from 'vitest';
import type { SchoolClass } from '@/types/class';
import {
  classEffectiveSubjectsLine,
  classReadinessBadge,
  classSubjectsSourceLine,
} from './class-display';
import {
  normalizeSchoolClass,
  resolveEffectiveSubjectsCount,
} from './normalize-class';

const tAr = (key: string, params?: Record<string, string | number>) => {
  const dict: Record<string, string> = {
    'admin.academicSetup.classEffectiveSubjects.few': '{count} مواد فعّالة',
    'admin.academicSetup.classEffectiveSubjects.one': 'مادة واحدة فعّالة',
    'admin.academicSetup.classEffectiveSubjects.two': 'مادتان فعّالتان',
    'admin.academicSetup.classEffectiveSubjects.many': '{count} مادة فعّالة',
    'admin.academicSetup.classEffectiveSubjects.zero': '0 مواد فعّالة',
    'admin.academicSetup.classSubjectsInheritedLevel.few': '{count} مواد موروثة من المستوى',
    'admin.academicSetup.classSubjectsInheritedLevel.one': 'مادة واحدة موروثة من المستوى',
    'admin.academicSetup.classSubjectsInheritedLevel.two': 'مادتان موروثتان من المستوى',
    'admin.academicSetup.classSubjectsInheritedLevel.many': '{count} مادة موروثة من المستوى',
    'admin.academicSetup.classSubjectsInheritedTrackOnly': 'مواد موروثة من الشعبة',
    'admin.academicSetup.classSubjectsInheritedLevelAndTrack': 'مواد موروثة من المستوى والشعبة',
    'admin.academicSetup.classSubjectsFromLevel.few': '{count} من المستوى',
    'admin.academicSetup.classSubjectsFromLevel.two': 'مادتان من المستوى',
    'admin.academicSetup.classSubjectsFromTrack.two': 'مادتان من الشعبة',
    'admin.academicSetup.classSubjectsLevelAndTrackBreakdown': '{levelPart} · {trackPart}',
    'admin.academicSetup.classSubjectsDirectOnly': 'مواد خاصة بالقسم',
    'admin.academicSetup.classSubjectsInheritedShort.few': '{count} موروثة',
    'admin.academicSetup.classSubjectsAdditional.one': 'مادة إضافية',
    'admin.academicSetup.classSubjectsInheritedPlusDirect': '{inherited} · {direct}',
    'admin.academicSetup.classNeedsTeacherAssignments.few': 'يحتاج تعيين أساتذة لـ {count} مواد',
    'admin.academicSetup.classMissingAssignmentsShort.few': '{count} إسنادات ناقصة',
  };
  let msg = dict[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      msg = msg.replace(`{${k}}`, String(v));
    }
  }
  return msg;
};

function p1aClass(overrides: Partial<SchoolClass> = {}): SchoolClass {
  return {
    id: 1,
    name: 'P1A',
    code: null,
    level: { id: 1, name: 'P1' },
    academic_year: null,
    student_count: 0,
    capacity: null,
    teachers: [],
    subjects: Array.from({ length: 6 }, (_, i) => ({
      id: i + 1,
      name: `Subject ${i + 1}`,
      source: 'level' as const,
    })),
    status: 'active',
    subjects_count: 6,
    effective_subjects_count: 6,
    inherited_level_subjects_count: 6,
    inherited_track_subjects_count: 0,
    direct_class_subjects_count: 0,
    excluded_subjects_count: 0,
    subjects_source: 'inherited',
    missing_teacher_assignments_count: 6,
    ...overrides,
  };
}

describe('resolveEffectiveSubjectsCount', () => {
  it('prefers effective_subjects_count over direct-only length', () => {
    const cls = p1aClass({
      effective_subjects_count: 6,
      direct_class_subjects_count: 0,
      subjects: [],
    });
    expect(resolveEffectiveSubjectsCount(cls)).toBe(6);
  });

  it('falls back to subjects_count then subjects.length for legacy payloads', () => {
    expect(
      resolveEffectiveSubjectsCount({
        subjects_count: 3,
        subjects: [{ id: 1, name: 'A' }],
      }),
    ).toBe(3);
    expect(
      resolveEffectiveSubjectsCount({
        subjects: [{ id: 1, name: 'A' }, { id: 2, name: 'B' }],
      }),
    ).toBe(2);
  });
});

describe('class card display — P1A inherited subjects', () => {
  it('shows 6 effective subjects not 0', () => {
    const cls = p1aClass({ subjects: [] });
    expect(classEffectiveSubjectsLine(tAr, 'ar', cls)).toBe('6 مواد فعّالة');
  });

  it('does not reduce count when direct_class_subjects_count is 0', () => {
    const cls = p1aClass({ direct_class_subjects_count: 0, subjects: [] });
    expect(classEffectiveSubjectsLine(tAr, 'ar', cls)).toBe('6 مواد فعّالة');
  });

  it('shows level-only inherited source line', () => {
    const cls = p1aClass();
    expect(classSubjectsSourceLine(tAr, 'ar', cls)).toBe('6 مواد موروثة من المستوى');
  });

  it('shows level and track breakdown when both inherited counts exist', () => {
    const cls = p1aClass({
      inherited_level_subjects_count: 4,
      inherited_track_subjects_count: 2,
      effective_subjects_count: 6,
      subjects_count: 6,
    });
    expect(classSubjectsSourceLine(tAr, 'ar', cls)).toBe('4 من المستوى · مادتان من الشعبة');
  });

  it('shows direct subjects as additional on top of inherited', () => {
    const cls = p1aClass({
      inherited_level_subjects_count: 6,
      direct_class_subjects_count: 1,
      effective_subjects_count: 7,
      subjects_count: 7,
    });
    expect(classSubjectsSourceLine(tAr, 'ar', cls)).toBe('6 موروثة · مادة إضافية');
  });

  it('shows clear assignment_missing readiness reason', () => {
    const cls = p1aClass({ missing_teacher_assignments_count: 6 });
    expect(classReadinessBadge(tAr, 'ar', cls)).toBe('يحتاج تعيين أساتذة لـ 6 مواد');
    expect(classReadinessBadge(tAr, 'ar', cls, 'short')).toBe('6 إسنادات ناقصة');
  });

  it('does not expose raw translation keys', () => {
    const cls = p1aClass();
    const lines = [
      classEffectiveSubjectsLine(tAr, 'ar', cls),
      classSubjectsSourceLine(tAr, 'ar', cls) ?? '',
      classReadinessBadge(tAr, 'ar', cls) ?? '',
    ];
    for (const line of lines) {
      expect(line).not.toMatch(/^admin\.academicSetup\./);
    }
  });
});

describe('normalizeSchoolClass', () => {
  it('deduplicates subjects and preserves effective count from API', () => {
    const normalized = normalizeSchoolClass(
      p1aClass({
        subjects: [
          { id: 1, name: 'A', source: 'level' },
          { id: 1, name: 'A duplicate', source: 'level' },
          { id: 2, name: 'B', source: 'level' },
        ],
        effective_subjects_count: 6,
      }),
    );
    expect(normalized.subjects).toHaveLength(2);
    expect(normalized.effective_subjects_count).toBe(6);
  });
});
