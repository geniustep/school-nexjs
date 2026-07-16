import { describe, expect, it } from 'vitest';
import {
  canApproveAnnualDistributions,
  canApproveDidacticSequences,
  canApproveTeachingOfferings,
  canApproveTeachingReferences,
  canManageAnnualDistributions,
  canManageDidacticSequences,
  canManageTeachingOfferings,
  canManageTeachingReferences,
  canSeeAnnualDistributions,
  canSeeDidacticSequences,
  canViewTeachingPlanning,
  isTeacherTeachingPlanningPath,
  isTeachingPlanningPath,
  TEACHING_DISTRIBUTIONS_APPROVE_CAPABILITY,
  TEACHING_DISTRIBUTIONS_MANAGE_CAPABILITY,
  TEACHING_OFFERINGS_APPROVE_CAPABILITY,
  TEACHING_OFFERINGS_MANAGE_CAPABILITY,
  TEACHING_PLANNING_VIEW_CAPABILITY,
  TEACHING_REFERENCES_MANAGE_CAPABILITY,
  TEACHING_SEQUENCES_APPROVE_CAPABILITY,
  TEACHING_SEQUENCES_MANAGE_CAPABILITY,
} from '@/lib/permissions/teaching-planning';
import type { CurrentUser } from '@/types/user';

function user(caps: string[]): CurrentUser {
  return {
    id: 1,
    name: 'Admin',
    email: 'admin@test.local',
    role: 'admin',
    effective_capabilities: caps,
    permissions: [],
    school: { id: 1, name: 'School' },
  } satisfies CurrentUser;
}

describe('teaching planning capabilities', () => {
  it('grants view when any teaching planning capability is present', () => {
    expect(canViewTeachingPlanning(user([TEACHING_PLANNING_VIEW_CAPABILITY]))).toBe(true);
    expect(canViewTeachingPlanning(user([TEACHING_REFERENCES_MANAGE_CAPABILITY]))).toBe(true);
    expect(canViewTeachingPlanning(user([TEACHING_OFFERINGS_MANAGE_CAPABILITY]))).toBe(true);
    expect(canViewTeachingPlanning(user([TEACHING_OFFERINGS_APPROVE_CAPABILITY]))).toBe(true);
    expect(canViewTeachingPlanning(user([TEACHING_DISTRIBUTIONS_MANAGE_CAPABILITY]))).toBe(true);
    expect(canViewTeachingPlanning(user([TEACHING_SEQUENCES_MANAGE_CAPABILITY]))).toBe(true);
  });

  it('denies system admin without teaching capabilities', () => {
    const admin = user(['view_classes', 'manage_classes', 'staff.view']);
    expect(canViewTeachingPlanning(admin)).toBe(false);
    expect(canManageTeachingReferences(admin)).toBe(false);
    expect(canManageTeachingOfferings(admin)).toBe(false);
    expect(canApproveTeachingReferences(admin)).toBe(false);
    expect(canApproveTeachingOfferings(admin)).toBe(false);
    expect(canManageDidacticSequences(admin)).toBe(false);
    expect(canManageAnnualDistributions(admin)).toBe(false);
    expect(canSeeDidacticSequences(admin)).toBe(false);
    expect(canSeeAnnualDistributions(admin)).toBe(false);
  });

  it('separates manage vs approve capabilities', () => {
    expect(canManageTeachingOfferings(user([TEACHING_OFFERINGS_MANAGE_CAPABILITY]))).toBe(true);
    expect(canApproveTeachingOfferings(user([TEACHING_OFFERINGS_MANAGE_CAPABILITY]))).toBe(false);
    expect(canApproveTeachingOfferings(user([TEACHING_OFFERINGS_APPROVE_CAPABILITY]))).toBe(true);
  });

  it('separates manage vs approve for sequences and distributions', () => {
    expect(canManageDidacticSequences(user([TEACHING_SEQUENCES_MANAGE_CAPABILITY]))).toBe(true);
    expect(canApproveDidacticSequences(user([TEACHING_SEQUENCES_MANAGE_CAPABILITY]))).toBe(false);
    expect(canApproveDidacticSequences(user([TEACHING_SEQUENCES_APPROVE_CAPABILITY]))).toBe(true);
    expect(canManageAnnualDistributions(user([TEACHING_DISTRIBUTIONS_MANAGE_CAPABILITY]))).toBe(
      true,
    );
    expect(canApproveAnnualDistributions(user([TEACHING_DISTRIBUTIONS_MANAGE_CAPABILITY]))).toBe(
      false,
    );
    expect(canApproveAnnualDistributions(user([TEACHING_DISTRIBUTIONS_APPROVE_CAPABILITY]))).toBe(
      true,
    );
  });

  it('reveals hub surfaces based on view or feature-specific capabilities', () => {
    // Plain view capability reveals both surfaces.
    expect(canSeeDidacticSequences(user([TEACHING_PLANNING_VIEW_CAPABILITY]))).toBe(true);
    expect(canSeeAnnualDistributions(user([TEACHING_PLANNING_VIEW_CAPABILITY]))).toBe(true);
    // Sequence approver sees sequences but not (only via) distribution rules.
    expect(canSeeDidacticSequences(user([TEACHING_SEQUENCES_APPROVE_CAPABILITY]))).toBe(true);
    expect(canSeeAnnualDistributions(user([TEACHING_SEQUENCES_APPROVE_CAPABILITY]))).toBe(false);
    // Offering managers/approvers can see distributions (they review readiness).
    expect(canSeeAnnualDistributions(user([TEACHING_OFFERINGS_APPROVE_CAPABILITY]))).toBe(true);
    expect(canSeeDidacticSequences(user([TEACHING_OFFERINGS_APPROVE_CAPABILITY]))).toBe(false);
  });

  it('detects teaching planning routes for guards', () => {
    expect(isTeachingPlanningPath('/admin/teaching-planning')).toBe(true);
    expect(isTeachingPlanningPath('/admin/teaching-planning/references/12')).toBe(true);
    expect(isTeachingPlanningPath('/admin/teaching-planning/offerings?x=1')).toBe(true);
    expect(isTeachingPlanningPath('/admin/teaching-planning/distributions/3')).toBe(true);
    expect(isTeachingPlanningPath('/admin/teaching-planning/sequences/9')).toBe(true);
    expect(isTeachingPlanningPath('/admin/academic')).toBe(false);
    expect(isTeachingPlanningPath('/admin/settings/academic-setup/assignments')).toBe(false);
  });

  it('detects teacher teaching planning routes separately from admin', () => {
    expect(isTeacherTeachingPlanningPath('/teacher/teaching-planning')).toBe(true);
    expect(isTeacherTeachingPlanningPath('/teacher/teaching-planning/distributions/4')).toBe(true);
    expect(isTeacherTeachingPlanningPath('/teacher/teaching-planning/sequences/8')).toBe(true);
    expect(isTeacherTeachingPlanningPath('/admin/teaching-planning')).toBe(false);
    expect(isTeachingPlanningPath('/teacher/teaching-planning/distributions/4')).toBe(false);
  });
});
