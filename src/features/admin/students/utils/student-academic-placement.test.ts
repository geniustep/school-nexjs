import { describe, expect, it } from 'vitest';
import type { CurrentUser } from '@/types/user';
import type { StudentEnrollment, StudentLevelOption } from '@/types/student-360';
import {
  academicPlacementCycleCode,
  academicPlacementErrorMessageKey,
  academicPlacementWillUnassign,
  buildAcademicPlacementCycles,
  canManageStudentAcademicPlacement,
  filterAcademicPlacementLevels,
  levelBelongsToAcademicPlacementCycle,
} from './student-academic-placement';

const levels: StudentLevelOption[] = [
  { id: 1, name: 'Primary 1', cycle: { code: 'primary' } },
  { id: 2, name: 'Primary 2', cycle: { code: 'primary' } },
  { id: 3, name: 'Middle 1', cycle: { code: 'middle_school' } },
];

function user(capabilities: string[] = [], permissions: string[] = []): CurrentUser {
  return {
    id: 1,
    name: 'Admin',
    email: null,
    role: 'admin',
    permissions: permissions as CurrentUser['permissions'],
    effective_capabilities: capabilities,
    school: { id: 1, name: 'School' },
  };
}

describe('student academic placement utilities', () => {
  it('uses Backend cycle.code directly and filters levels without code inference', () => {
    expect(academicPlacementCycleCode(levels[0])).toBe('primary');
    expect(buildAcademicPlacementCycles(levels)).toEqual(['primary', 'middle_school']);
    expect(filterAcademicPlacementLevels(levels, 'primary').map((level) => level.id)).toEqual([1, 2]);
    expect(levelBelongsToAcademicPlacementCycle('3', 'primary', levels)).toBe(false);
  });

  it('does not infer a cycle when Backend cycle metadata is absent', () => {
    const legacy: StudentLevelOption[] = [{ id: 9, name: 'Legacy', code: '1AEP' }];
    expect(buildAcademicPlacementCycles(legacy)).toEqual([]);
    expect(filterAcademicPlacementLevels(legacy, 'primary')).toEqual([]);
  });

  it('predicts unassign only when a class exists and target level differs', () => {
    const enrollment: StudentEnrollment = {
      id: 10,
      state: 'active',
      level: levels[0],
      class: { id: 7, name: 'A' },
    };
    expect(academicPlacementWillUnassign(enrollment, 1)).toBe(false);
    expect(academicPlacementWillUnassign(enrollment, 2)).toBe(true);
    expect(academicPlacementWillUnassign({ ...enrollment, class: null }, 2)).toBe(false);
  });

  it('matches the Backend RBAC contract for full and limited editors', () => {
    expect(canManageStudentAcademicPlacement(user([], ['manage_students']))).toBe(true);
    expect(
      canManageStudentAcademicPlacement(
        user(['students.update_limited', 'students.manage_registration_data']),
      ),
    ).toBe(true);
    expect(canManageStudentAcademicPlacement(user(['students.update_limited']))).toBe(false);
  });

  it('maps finance and permission blockers to dedicated UX messages', () => {
    expect(academicPlacementErrorMessageKey('finance_review_required')).toContain('financeReviewRequired');
    expect(
      academicPlacementErrorMessageKey('finance_review_required', {
        finance_review_reasons: ['target_level_not_covered_by_fee_plan'],
      }),
    ).toContain('targetLevelNotCoveredByFeePlan');
    expect(academicPlacementErrorMessageKey('registration_data_permission_required')).toContain('permissionDenied');
  });
});
