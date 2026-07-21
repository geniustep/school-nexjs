import { describe, expect, it } from 'vitest';
import {
  checkTeacherDomainContract,
  normalizeAcademicProfile,
  normalizeAssignmentDetail,
  normalizeTeacherSummaries,
  stripForbiddenAcademicWriteKeys,
} from './teacher-domain-normalize';
import { TEACHER_DOMAIN_CONTRACT_VERSION } from '@/types/teacher-domain';

describe('teacher-domain-normalize', () => {
  it('checks contract version and required keys', () => {
    const ok = checkTeacherDomainContract({
      contract_name: 'teacher_domain_school_api',
      contract_version: TEACHER_DOMAIN_CONTRACT_VERSION,
      generic_orm_endpoint: false,
    });
    expect(ok.ok).toBe(true);
    expect(ok.genericOrm).toBe(false);

    const bad = checkTeacherDomainContract({
      contract_name: 'x',
      generic_orm_endpoint: true,
    });
    expect(bad.ok).toBe(false);
    expect(bad.missingRequired).toContain('contract_version');
    expect(bad.genericOrm).toBe(true);
  });

  it('normalizes lightweight teacher rows and allowed_actions', () => {
    const rows = normalizeTeacherSummaries([
      {
        id: 1,
        name: 'A',
        code: '1',
        status: 'active',
        allowed_actions: { view: true, edit: false },
        assignment_summary: { active_count: 1 },
      },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].allowed_actions).toEqual({ view: true });
    expect(rows[0].assignment_summary?.active_count).toBe(1);
  });

  it('keeps academic eligibility separate from assignments', () => {
    const profile = normalizeAcademicProfile({
      teacher_id: 7,
      eligibility: { eligible_subjects: [{ id: 1, name: 'PC' }] },
      current_assignments: [{ id: 99, class: { id: 1, name: '3A' } }],
      operational_derived: { writable: false },
      allowed_actions: ['view', 'edit_eligibility'],
    });
    expect(profile?.eligibility?.eligible_subjects?.[0].name).toBe('PC');
    expect(profile?.current_assignments?.[0].id).toBe(99);
    expect(profile?.operational_derived?.writable).toBe(false);
    expect(profile?.allowed_actions).toEqual({ view: true, edit_eligibility: true });
  });

  it('normalizes 238 completeness / dimensions / mismatch without coercion', () => {
    const profile = normalizeAcademicProfile({
      teacher_id: 7,
      eligibility_dimensions: {
        subjects: { mode: 'unspecified', count: 0 },
        cycles: { mode: 'specified', count: 2 },
      },
      academic_completeness: {
        state: 'partial',
        blocks_assignment: false,
        weekly_limit_specified: false,
      },
      completeness_warnings: [{ code: 'subjects_unspecified' }],
      assignment_mismatch_summary: {
        count: 1,
        warnings: [{ assignment_id: 5, reason_code: 'assignment_subject_outside_declared_eligibility' }],
      },
      limits: { weekly_hours_target: null, weekly_hours_max: null },
      allowed_actions: {
        can_edit_academic_profile: true,
        edit_eligibility: false,
      },
    });
    expect(profile?.eligibility_dimensions?.subjects?.mode).toBe('unspecified');
    expect(profile?.academic_completeness?.blocks_assignment).toBe(false);
    expect(profile?.completeness_warnings?.[0].code).toBe('subjects_unspecified');
    expect(profile?.assignment_mismatch_summary?.count).toBe(1);
    expect(profile?.limits?.weekly_hours_target).toBeNull();
    expect(profile?.allowed_actions).toEqual({ can_edit_academic_profile: true });
  });

  it('unwraps assignment detail item envelope', () => {
    const detail = normalizeAssignmentDetail({
      item: { id: 3, state: 'active', allowed_actions: { suspend: true } },
    });
    expect(detail?.id).toBe(3);
    expect(detail?.allowed_actions).toEqual({ suspend: true });
  });

  it('strips assignment/timetable keys from academic writes', () => {
    expect(
      stripForbiddenAcademicWriteKeys({
        specialization: 'Math',
        assignment_ids: [1],
        current_assignments: [],
        class_ids: [2],
        timetable_slots: [],
        operational_derived: {},
        derived_workload: {},
      }),
    ).toEqual({ specialization: 'Math' });
  });
});
