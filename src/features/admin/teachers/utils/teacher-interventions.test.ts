import { describe, expect, it } from 'vitest';
import type { TeacherSummary } from '@/types/teacher-domain';
import {
  countTeacherInterventions,
  deriveTeacherInterventions,
  filterTeachersByOperationalPreset,
  getTeacherPrimaryIntervention,
  teacherMatchesOperationalPreset,
  teacherNeedsIntervention,
} from './teacher-interventions';

function teacherStub(partial: Partial<TeacherSummary> & { id: number }): TeacherSummary {
  return {
    name: partial.name ?? `Teacher ${partial.id}`,
    code: partial.code ?? `T${partial.id}`,
    status: partial.status ?? 'active',
    active: partial.active ?? true,
    subjects: [],
    classes: [],
    warnings: [],
    ...partial,
  } as TeacherSummary;
}

describe('teacher-interventions P0', () => {
  it('flags active teacher with operational_count 0 as NO_OPERATIONAL_ASSIGNMENT', () => {
    const teacher = teacherStub({
      id: 1,
      employment: { state: 'active', active: true },
      assignment_summary: { operational_count: 0, active_count: 2 },
    });
    const codes = deriveTeacherInterventions(teacher).map((item) => item.code);
    expect(codes).toContain('NO_OPERATIONAL_ASSIGNMENT');
    expect(getTeacherPrimaryIntervention(teacher)?.code).toBe('NO_OPERATIONAL_ASSIGNMENT');
    expect(getTeacherPrimaryIntervention(teacher)?.targetPath).toBe(
      '/admin/teaching-assignments?teacher_id=1',
    );
  });

  it('does not flag non-active employment as missing operational assignment', () => {
    const teacher = teacherStub({
      id: 2,
      active: false,
      status: 'archived',
      employment: { state: 'archived', active: false },
      assignment_summary: { operational_count: 0 },
    });
    const codes = deriveTeacherInterventions(teacher).map((item) => item.code);
    expect(codes).not.toContain('NO_OPERATIONAL_ASSIGNMENT');
  });

  it('does not invent NO_OPERATIONAL_ASSIGNMENT when operational_count is missing', () => {
    const teacher = teacherStub({
      id: 3,
      employment: { state: 'active', active: true },
      assignment_summary: { active_count: 0 },
    });
    expect(deriveTeacherInterventions(teacher).map((i) => i.code)).not.toContain(
      'NO_OPERATIONAL_ASSIGNMENT',
    );
  });

  it('flags missing linked user as ACCOUNT_INACTIVE_OR_MISSING', () => {
    const teacher = teacherStub({
      id: 4,
      account: { has_linked_user: false, user_id: null },
    });
    expect(deriveTeacherInterventions(teacher).map((i) => i.code)).toContain(
      'ACCOUNT_INACTIVE_OR_MISSING',
    );
  });

  it('flags user_active=false without duplicating account codes', () => {
    const teacher = teacherStub({
      id: 5,
      account: { has_linked_user: true, user_active: false, user_id: 9 },
    });
    const items = deriveTeacherInterventions(teacher).filter(
      (item) => item.code === 'ACCOUNT_INACTIVE_OR_MISSING',
    );
    expect(items).toHaveLength(1);
    expect(items[0]?.targetPath).toBe('/admin/teachers/5?tab=account');
  });

  it('flags partial academic completeness and ignores complete', () => {
    const partial = teacherStub({
      id: 6,
      academic_profile_summary: { academic_completeness: 'partial' },
    });
    const complete = teacherStub({
      id: 7,
      academic_profile_summary: { academic_completeness: 'complete' },
    });
    expect(deriveTeacherInterventions(partial).map((i) => i.code)).toContain(
      'ACADEMIC_PROFILE_INCOMPLETE',
    );
    expect(deriveTeacherInterventions(complete).map((i) => i.code)).not.toContain(
      'ACADEMIC_PROFILE_INCOMPLETE',
    );
  });

  it('does not flag missing academic_completeness as incomplete', () => {
    const teacher = teacherStub({
      id: 8,
      academic_profile_summary: { subject_eligibility_count: 1 },
    });
    expect(deriveTeacherInterventions(teacher).map((i) => i.code)).not.toContain(
      'ACADEMIC_PROFILE_INCOMPLETE',
    );
  });

  it('flags row warnings as HAS_ROW_WARNINGS', () => {
    const teacher = teacherStub({
      id: 9,
      warnings: [{ code: 'subjects_unspecified', message: 'مواد غير محددةة' }],
    });
    const item = deriveTeacherInterventions(teacher).find((i) => i.code === 'HAS_ROW_WARNINGS');
    expect(item?.warningCode).toBe('subjects_unspecified');
    expect(item?.warningMessage).toBe('مواد غير محددةة');
  });

  it('orders P1 before P2 and keeps a stable primary at equal priority', () => {
    const teacher = teacherStub({
      id: 10,
      employment: { state: 'active', active: true },
      assignment_summary: { operational_count: 0 },
      account: { has_linked_user: false },
      academic_profile_summary: { academic_completeness: 'unconfigured' },
      warnings: [{ code: 'x' }],
    });
    const codes = deriveTeacherInterventions(teacher).map((item) => item.code);
    expect(codes[0]).toBe('NO_OPERATIONAL_ASSIGNMENT');
    expect(codes[1]).toBe('ACCOUNT_INACTIVE_OR_MISSING');
    expect(codes.indexOf('ACADEMIC_PROFILE_INCOMPLETE')).toBeLessThan(
      codes.indexOf('HAS_ROW_WARNINGS'),
    );
    expect(getTeacherPrimaryIntervention(teacher)?.code).toBe('NO_OPERATIONAL_ASSIGNMENT');
  });

  it('preset needs_intervention unions teachers once', () => {
    const teachers = [
      teacherStub({
        id: 11,
        employment: { state: 'active', active: true },
        assignment_summary: { operational_count: 0 },
        account: { has_linked_user: false },
        academic_profile_summary: { academic_completeness: 'partial' },
      }),
      teacherStub({
        id: 12,
        employment: { state: 'active', active: true },
        assignment_summary: { operational_count: 3 },
        account: { has_linked_user: true, user_active: true },
        academic_profile_summary: { academic_completeness: 'complete' },
      }),
    ];
    const matched = filterTeachersByOperationalPreset(teachers, 'needs_intervention');
    expect(matched.map((t) => t.id)).toEqual([11]);
    expect(teacherNeedsIntervention(teachers[0]!)).toBe(true);
    expect(teacherNeedsIntervention(teachers[1]!)).toBe(false);
  });

  it('preset no_assignment uses operational_count not active_count', () => {
    const onlyActiveCount = teacherStub({
      id: 13,
      employment: { state: 'active', active: true },
      assignment_summary: { active_count: 0, operational_count: 2 },
    });
    const zeroOperational = teacherStub({
      id: 14,
      employment: { state: 'active', active: true },
      assignment_summary: { active_count: 4, operational_count: 0 },
    });
    expect(teacherMatchesOperationalPreset(onlyActiveCount, 'no_assignment')).toBe(false);
    expect(teacherMatchesOperationalPreset(zeroOperational, 'no_assignment')).toBe(true);
  });

  it('counts teachers once in needsIntervention even with multiple reasons', () => {
    const teachers = [
      teacherStub({
        id: 15,
        employment: { state: 'active', active: true },
        assignment_summary: { operational_count: 0 },
        account: { has_linked_user: false },
        academic_profile_summary: { academic_completeness: 'partial' },
      }),
      teacherStub({
        id: 16,
        employment: { state: 'active', active: true },
        assignment_summary: { operational_count: 1 },
        account: { has_linked_user: true, user_active: true },
        academic_profile_summary: { academic_completeness: 'complete' },
      }),
    ];
    const counts = countTeacherInterventions(teachers);
    expect(counts.needsIntervention).toBe(1);
    expect(counts.noAssignment).toBe(1);
    expect(counts.inactiveAccount).toBe(1);
    expect(counts.incompleteAcademic).toBe(1);
  });

  it('reset preset all returns all loaded teachers', () => {
    const teachers = [
      teacherStub({ id: 17, account: { has_linked_user: false } }),
      teacherStub({
        id: 18,
        account: { has_linked_user: true, user_active: true },
        academic_profile_summary: { academic_completeness: 'complete' },
      }),
    ];
    expect(filterTeachersByOperationalPreset(teachers, 'all')).toHaveLength(2);
  });

  it('nullish fields do not crash or invent unreliable interventions', () => {
    const teacher = teacherStub({
      id: 19,
      employment: null,
      account: null,
      academic_profile_summary: null,
      assignment_summary: null,
      warnings: undefined,
    });
    const codes = deriveTeacherInterventions(teacher).map((i) => i.code);
    expect(codes).toEqual(['ACCOUNT_INACTIVE_OR_MISSING']);
  });

  it('composition counts follow the manually filtered set, not the raw window', () => {
    const activeNoAssign = teacherStub({
      id: 20,
      employment: { state: 'active', active: true },
      assignment_summary: { operational_count: 0 },
      account: { has_linked_user: true, user_active: true },
      academic_profile_summary: { academic_completeness: 'complete' },
    });
    const archivedNoAssign = teacherStub({
      id: 21,
      active: false,
      status: 'archived',
      employment: { state: 'archived', active: false },
      assignment_summary: { operational_count: 0 },
      account: { has_linked_user: true, user_active: true },
      academic_profile_summary: { academic_completeness: 'complete' },
    });
    const rawWindow = [activeNoAssign, archivedNoAssign];
    const manualActiveOnly = rawWindow.filter(
      (row) => row.employment?.state === 'active' && row.active !== false,
    );
    expect(countTeacherInterventions(rawWindow).noAssignment).toBe(1);
    expect(countTeacherInterventions(manualActiveOnly).noAssignment).toBe(1);
    expect(countTeacherInterventions(manualActiveOnly).needsIntervention).toBe(1);
    // Archived teacher must not inflate no-assignment composition after an
    // active-only manual filter (card click applies preset on that same set).
    expect(manualActiveOnly.map((row) => row.id)).toEqual([20]);
  });
});
