import { describe, expect, it } from 'vitest';
import {
  filterTeacherSummaries,
  matchesTeacherListFilters,
  paginateTeacherSummaries,
  resolveTeacherListEmptyVariant,
  teacherAccountStateLabelKey,
  teacherHasActiveAssignments,
  teacherInitials,
  teacherPrimaryActions,
  teacherWarningCount,
} from './teacher-domain-present';
import type { TeacherSummary } from '@/types/teacher-domain';

function teacherStub(partial: Partial<TeacherSummary> & { id: number }): TeacherSummary {
  return {
    name: partial.name ?? `Teacher ${partial.id}`,
    status: partial.status ?? 'active',
    active: partial.active ?? true,
    subjects: [],
    classes: [],
    warnings: [],
    ...partial,
  } as TeacherSummary;
}
import { teacherDomainScopeChanged } from './teacher-domain-query-keys';
import { hasAllowedAction } from './teacher-domain-allowed-actions';

describe('teacher-domain-present', () => {
  it('builds initials and account labels', () => {
    expect(teacherInitials('أمل العباس')).toBe('أا');
    expect(
      teacherAccountStateLabelKey({
        account: { has_linked_user: true, user_active: true },
        active: true,
      }),
    ).toBe('admin.teacherDomain.account.active');
    expect(
      teacherAccountStateLabelKey({
        account: { has_linked_user: false, user_id: null },
        active: true,
      }),
    ).toBe('admin.teacherDomain.account.none');
  });

  it('shows only backend-allowed primary actions', () => {
    expect(
      teacherPrimaryActions({
        allowed_actions: { edit: true, archive: true, terminate: false, reactivate: true },
      }),
    ).toEqual(['edit', 'archive', 'reactivate']);
    expect(hasAllowedAction({ suspend: false, end: true }, 'suspend')).toBe(false);
    expect(hasAllowedAction({ suspend: false, end: true }, 'end')).toBe(true);
  });

  it('distinguishes empty vs no-match list states', () => {
    expect(resolveTeacherListEmptyVariant({ total: 0, hasActiveFilters: false })).toBe('empty');
    expect(resolveTeacherListEmptyVariant({ total: 0, hasActiveFilters: true })).toBe('noMatch');
    expect(teacherWarningCount({ warnings: [{ code: 'x' }, { code: 'y' }] })).toBe(2);
  });

  it('filters teachers by employment, active flag, and assignments client-side', () => {
    const withAssign = teacherStub({
      id: 1,
      employment: { state: 'active', active: true },
      assignment_summary: { active_count: 2, operational_count: 2 },
    });
    const withoutAssign = teacherStub({
      id: 2,
      employment: { state: 'active', active: true },
      assignment_summary: { active_count: 0, operational_count: 0 },
    });
    const archived = teacherStub({
      id: 3,
      status: 'archived',
      active: false,
      employment: { state: 'archived', active: false },
      assignment_summary: { active_count: 0 },
    });

    expect(teacherHasActiveAssignments(withAssign)).toBe(true);
    expect(teacherHasActiveAssignments(withoutAssign)).toBe(false);
    expect(matchesTeacherListFilters(archived, { state: 'archived' })).toBe(true);
    expect(matchesTeacherListFilters(withAssign, { state: 'archived' })).toBe(false);
    expect(matchesTeacherListFilters(withAssign, { hasAssignments: 'true' })).toBe(true);
    expect(matchesTeacherListFilters(withoutAssign, { hasAssignments: 'false' })).toBe(true);
    expect(matchesTeacherListFilters(withAssign, { active: 'false' })).toBe(false);

    const filtered = filterTeacherSummaries([withAssign, withoutAssign, archived], {
      hasAssignments: 'true',
    });
    expect(filtered.map((row) => row.id)).toEqual([1]);
    expect(paginateTeacherSummaries([withAssign, withoutAssign, archived], 2, 2).map((r) => r.id)).toEqual([
      3,
    ]);
  });

  it('detects school/role scope changes for cache safety', () => {
    expect(
      teacherDomainScopeChanged(
        { schoolId: 3, role: 'admin' },
        { schoolId: 3, role: 'admin' },
      ),
    ).toBe(false);
    expect(
      teacherDomainScopeChanged(
        { schoolId: 3, role: 'admin' },
        { schoolId: 4, role: 'admin' },
      ),
    ).toBe(true);
    expect(
      teacherDomainScopeChanged(
        { schoolId: 3, role: 'admin' },
        { schoolId: 3, role: 'teacher' },
      ),
    ).toBe(true);
  });
});
