import { describe, expect, it, vi, beforeEach } from 'vitest';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import {
  buildAssignmentMutationPayload,
  buildEligibleTeachersQuery,
  fetchTeachingAssignmentEligibleTeachers,
  normalizeTeachingAssignmentCandidate,
  normalizeTeachingAssignmentCandidatesResponse,
} from './teaching-assignment-eligible-teachers-api';

vi.mock('@/lib/api/client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const mockApi = vi.mocked(api);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('teaching-assignment-eligible-teachers-api', () => {
  it('builds query without school_id and omits undefined values', () => {
    expect(
      buildEligibleTeachersQuery({
        class_id: 10,
        subject_id: 20,
        academic_year_id: undefined,
        teaching_offering_id: 30,
        role: 'main',
        include_ineligible: true,
      }),
    ).toEqual({
      class_id: 10,
      subject_id: 20,
      teaching_offering_id: 30,
      role: 'main',
      include_ineligible: 'true',
    });
    expect(buildEligibleTeachersQuery({ class_id: 1, subject_id: 2 })).not.toHaveProperty(
      'school_id',
    );
  });

  it('parses four eligibility states and null timetable conflict', () => {
    const candidate = normalizeTeachingAssignmentCandidate({
      teacher_id: 7,
      display_name: 'أستاذ',
      eligibility_state: 'eligible_with_warning',
      eligible: true,
      can_assign: true,
      requires_override: false,
      blocking_reasons: [],
      warning_reasons: [
        { code: 'weekly_load_limit_unspecified', message: 'limit', severity: 'warning' },
      ],
      informational_reasons: [],
      current_weekly_load: 4,
      maximum_weekly_load: null,
      remaining_weekly_capacity: 0,
      availability_state: 'not_evaluated',
      has_timetable_conflict: null,
      allowed_actions: { can_assign: true, can_override: false },
    });
    expect(candidate).toMatchObject({
      teacher_id: 7,
      eligibility_state: 'eligible_with_warning',
      maximum_weekly_load: null,
      remaining_weekly_capacity: 0,
      has_timetable_conflict: null,
    });
  });

  it('parses summary and allowed_actions from backend', () => {
    const data = normalizeTeachingAssignmentCandidatesResponse({
      summary: {
        total_candidates: 5,
        eligible_count: 2,
        eligible_with_warning_count: 1,
        override_required_count: 1,
        not_eligible_count: 1,
      },
      candidates: [
        {
          teacher_id: 1,
          eligibility_state: 'eligible',
          eligible: true,
          can_assign: true,
          requires_override: false,
          blocking_reasons: [],
          warning_reasons: [],
          informational_reasons: [],
        },
        {
          teacher_id: 2,
          eligibility_state: 'not_eligible',
          eligible: false,
          can_assign: false,
          requires_override: false,
          blocking_reasons: [{ code: 'inactive_teacher' }],
          warning_reasons: [],
          informational_reasons: [],
        },
      ],
      allowed_actions: {
        can_view_candidates: true,
        can_create_assignment: true,
        can_override_assignment_eligibility: false,
        can_view_ineligible_candidates: true,
      },
    });
    expect(data?.summary.eligible_count).toBe(2);
    expect(data?.allowed_actions?.can_view_ineligible_candidates).toBe(true);
    expect(data?.candidates).toHaveLength(2);
  });

  it('fetches eligible-teachers endpoint and normalizes response', async () => {
    mockApi.get.mockResolvedValueOnce({
      success: true,
      data: {
        summary: {
          total_candidates: 1,
          eligible_count: 1,
          eligible_with_warning_count: 0,
          override_required_count: 0,
          not_eligible_count: 0,
        },
        candidates: [
          {
            teacher_id: 9,
            eligibility_state: 'eligible',
            eligible: true,
            can_assign: true,
            requires_override: false,
            blocking_reasons: [],
            warning_reasons: [],
            informational_reasons: [],
            has_timetable_conflict: false,
          },
        ],
        allowed_actions: { can_view_candidates: true, can_create_assignment: true },
      },
      meta: {},
    });
    const res = await fetchTeachingAssignmentEligibleTeachers({
      class_id: 1,
      subject_id: 2,
      include_ineligible: false,
    });
    expect(mockApi.get).toHaveBeenCalledWith(
      endpoints.admin.teachingAssignmentEligibleTeachers,
      { class_id: 1, subject_id: 2 },
    );
    expect(res.success && res.data.candidates[0].teacher_id).toBe(9);
  });

  it('strips client eligibility facts from mutation payload and sends override only when true', () => {
    expect(
      buildAssignmentMutationPayload({
        teacher_id: 3,
        class_id: 1,
        subject_id: 2,
        override: true,
        override_reason: '  مبرر  ',
        ...({
          can_assign: true,
          eligibility_state: 'override_required',
          blocking_reasons: [{ code: 'x' }],
          override_rule_codes: ['teacher_subject_outside_declared_eligibility'],
        } as Record<string, unknown>),
      } as never),
    ).toEqual({
      teacher_id: 3,
      class_id: 1,
      subject_id: 2,
      override: true,
      override_reason: 'مبرر',
    });

    expect(
      buildAssignmentMutationPayload({
        teacher_id: 3,
        override_reason: 'should drop',
      }),
    ).toEqual({ teacher_id: 3 });
  });
});
