import { describe, expect, it } from 'vitest';
import {
  resolveTeacherListEmptyVariant,
  teacherAccountStateLabelKey,
  teacherInitials,
  teacherPrimaryActions,
  teacherWarningCount,
} from './teacher-domain-present';
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
