import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import {
  archiveTeacher,
  endTeachingAssignment,
  fetchTeacher,
  fetchTeacherAcademicProfile,
  fetchTeacherDomainContract,
  fetchTeachers,
  fetchTeachingAssignment,
  fetchTeachingAssignments,
  fetchTeachingOfferingsDomain,
  terminateTeacher,
  updateTeacherAcademicProfile,
} from './teacher-domain-api';
import { TEACHER_DOMAIN_CONTRACT_VERSION } from '@/types/teacher-domain';

vi.mock('@/lib/api/client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

const mockApi = vi.mocked(api);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('teacher-domain-api', () => {
  it('parses contract version and rejects generic ORM', async () => {
    mockApi.get.mockResolvedValueOnce({
      success: true,
      data: {
        contract_name: 'teacher_domain_school_api',
        contract_version: TEACHER_DOMAIN_CONTRACT_VERSION,
        generic_orm_endpoint: false,
        domains: ['teacher_profile'],
      },
      meta: {},
    });
    const res = await fetchTeacherDomainContract();
    expect(mockApi.get).toHaveBeenCalledWith(endpoints.admin.teacherDomainContract, undefined);
    expect(res.success && res.data.contract_version).toBe(TEACHER_DOMAIN_CONTRACT_VERSION);
    expect(res.success && res.meta.teacher_domain_contract_check).toMatchObject({
      ok: true,
      genericOrm: false,
    });
  });

  it('normalizes teacher list with allowed_actions and pagination meta', async () => {
    mockApi.get.mockResolvedValueOnce({
      success: true,
      data: [
        {
          id: 1,
          name: 'أستاذ',
          code: 'T1',
          status: 'active',
          allowed_actions: { view: true, edit: false, archive: true },
          assignment_summary: { active_count: 2 },
          warnings: [],
        },
      ],
      meta: {
        pagination: { page: 1, page_size: 20, total: 1, total_pages: 1 },
      },
    });
    const res = await fetchTeachers({ page: 1, page_size: 20, search: 'أستاذ' });
    expect(mockApi.get).toHaveBeenCalledWith(endpoints.admin.teachers, {
      page: 1,
      page_size: 20,
      search: 'أستاذ',
    });
    expect(res.success && res.data[0].allowed_actions).toEqual({
      view: true,
      archive: true,
    });
    expect(res.success && res.meta.pagination?.total).toBe(1);
  });

  it('fetches teacher detail and academic profile endpoints', async () => {
    mockApi.get
      .mockResolvedValueOnce({
        success: true,
        data: {
          id: 9,
          name: 'A',
          code: null,
          status: 'active',
          allowed_actions: ['view', 'edit'],
        },
        meta: {},
      })
      .mockResolvedValueOnce({
        success: true,
        data: {
          teacher_id: 9,
          eligibility: { eligible_subjects: [{ id: 1, name: 'Math' }] },
          allowed_actions: { view: true, edit_eligibility: true },
          current_assignments: [{ id: 3 }],
        },
        meta: {},
      });

    const detail = await fetchTeacher(9);
    const academic = await fetchTeacherAcademicProfile(9);
    expect(mockApi.get).toHaveBeenNthCalledWith(1, endpoints.admin.teacher(9), undefined);
    expect(mockApi.get).toHaveBeenNthCalledWith(
      2,
      endpoints.admin.teacherAcademicProfile(9),
      undefined,
    );
    expect(detail.success && detail.data.allowed_actions).toEqual({ view: true, edit: true });
    expect(academic.success && academic.data.eligibility?.eligible_subjects?.[0].name).toBe('Math');
  });

  it('posts terminate/archive with reason and uses action endpoints', async () => {
    mockApi.post
      .mockResolvedValueOnce({
        success: true,
        data: { item: { id: 9, name: 'A', code: null, status: 'terminated' } },
        meta: {},
      })
      .mockResolvedValueOnce({
        success: true,
        data: { item: { id: 9, name: 'A', code: null, status: 'archived' } },
        meta: {},
      });

    await terminateTeacher(9, { reason: 'end', employment_end_date: '2026-07-20' });
    await archiveTeacher(9, { reason: 'archive' });
    expect(mockApi.post).toHaveBeenNthCalledWith(
      1,
      endpoints.admin.teacherTerminate(9),
      { reason: 'end', employment_end_date: '2026-07-20' },
      undefined,
    );
    expect(mockApi.post).toHaveBeenNthCalledWith(
      2,
      endpoints.admin.teacherArchive(9),
      { reason: 'archive' },
      undefined,
    );
  });

  it('strips forbidden academic write keys before PATCH', async () => {
    mockApi.patch.mockResolvedValueOnce({
      success: true,
      data: { teacher_id: 9, eligibility: {} },
      meta: {},
    });
    await updateTeacherAcademicProfile(9, {
      specialization: 'Physics',
      // @ts-expect-error intentional forbidden keys for safety test
      assignment_ids: [1],
      current_assignments: [{ id: 1 }],
      class_ids: [2],
      timetable_slots: [],
    });
    expect(mockApi.patch).toHaveBeenCalledWith(
      endpoints.admin.teacherAcademicProfile(9),
      { specialization: 'Physics' },
      undefined,
    );
  });

  it('PATCHes eligible_cycle_ids as a partial academic update', async () => {
    mockApi.patch.mockResolvedValueOnce({
      success: true,
      data: {
        teacher_id: 9,
        eligibility: {
          cycles: [{ id: 1, name: 'Primary' }],
          eligible_subjects: [{ id: 4, name: 'Math' }],
        },
      },
      meta: {},
    });
    const res = await updateTeacherAcademicProfile(9, {
      eligible_cycle_ids: [1, 2],
    });
    expect(mockApi.patch).toHaveBeenCalledWith(
      endpoints.admin.teacherAcademicProfile(9),
      { eligible_cycle_ids: [1, 2] },
      undefined,
    );
    expect(res.success && res.data.eligibility?.cycles?.[0].id).toBe(1);
    expect(res.success && res.data.eligibility?.eligible_subjects?.[0].name).toBe('Math');
  });

  it('PATCHes empty eligible_cycle_ids explicitly', async () => {
    mockApi.patch.mockResolvedValueOnce({
      success: true,
      data: { teacher_id: 9, eligibility: { cycles: [] } },
      meta: {},
    });
    await updateTeacherAcademicProfile(9, { eligible_cycle_ids: [] });
    expect(mockApi.patch).toHaveBeenCalledWith(
      endpoints.admin.teacherAcademicProfile(9),
      { eligible_cycle_ids: [] },
      undefined,
    );
  });

  it('parses academic profile 238 additive fields without inventing values', async () => {
    mockApi.get.mockResolvedValueOnce({
      success: true,
      data: {
        teacher_id: 9,
        specialization: 'Physics',
        teacher_type: 'permanent',
        eligibility: {
          subjects: [],
          eligible_subjects: [],
          cycles: [],
          levels: [],
          teaching_languages: [],
        },
        eligibility_dimensions: {
          subjects: { mode: 'unspecified', count: 0 },
          cycles: { mode: 'unspecified', count: 0 },
          levels: { mode: 'unspecified', count: 0 },
          teaching_languages: { mode: 'unspecified', count: 0 },
        },
        academic_completeness: {
          state: 'unconfigured',
          blocks_assignment: false,
          weekly_limit_specified: false,
        },
        completeness_warnings: [{ code: 'subjects_unspecified' }],
        assignment_mismatch_summary: { count: 0, warnings: [] },
        limits: {
          weekly_hours_target: null,
          weekly_hours_max: null,
          daily_hours_max: null,
          max_continuous_minutes: null,
        },
        allowed_actions: {
          view: true,
          can_view: true,
          edit_eligibility: true,
          can_edit_academic_profile: true,
        },
      },
      meta: {},
    });
    const res = await fetchTeacherAcademicProfile(9);
    expect(res.success).toBe(true);
    if (!res.success) return;
    expect(res.data.academic_completeness?.state).toBe('unconfigured');
    expect(res.data.academic_completeness?.blocks_assignment).toBe(false);
    expect(res.data.eligibility_dimensions?.subjects?.mode).toBe('unspecified');
    expect(res.data.completeness_warnings?.[0].code).toBe('subjects_unspecified');
    expect(res.data.assignment_mismatch_summary?.count).toBe(0);
    expect(res.data.limits?.weekly_hours_target).toBeNull();
    expect(res.data.allowed_actions).toMatchObject({
      edit_eligibility: true,
      can_edit_academic_profile: true,
    });
  });

  it('PATCHes partial eligible_subject_ids / eligible_level_ids / teaching_language_ids', async () => {
    mockApi.patch
      .mockResolvedValueOnce({
        success: true,
        data: { teacher_id: 9, eligibility: { eligible_subjects: [] } },
        meta: {},
      })
      .mockResolvedValueOnce({
        success: true,
        data: { teacher_id: 9, eligibility: { levels: [{ id: 2, name: 'L2' }] } },
        meta: {},
      })
      .mockResolvedValueOnce({
        success: true,
        data: { teacher_id: 9, eligibility: { teaching_languages: [] } },
        meta: {},
      });

    await updateTeacherAcademicProfile(9, { eligible_subject_ids: [] });
    await updateTeacherAcademicProfile(9, { eligible_level_ids: [2] });
    await updateTeacherAcademicProfile(9, { teaching_language_ids: [] });

    expect(mockApi.patch).toHaveBeenNthCalledWith(
      1,
      endpoints.admin.teacherAcademicProfile(9),
      { eligible_subject_ids: [] },
      undefined,
    );
    expect(mockApi.patch).toHaveBeenNthCalledWith(
      2,
      endpoints.admin.teacherAcademicProfile(9),
      { eligible_level_ids: [2] },
      undefined,
    );
    expect(mockApi.patch).toHaveBeenNthCalledWith(
      3,
      endpoints.admin.teacherAcademicProfile(9),
      { teaching_language_ids: [] },
      undefined,
    );
  });

  it('PATCHes null workload limits without coercing to zero', async () => {
    mockApi.patch.mockResolvedValueOnce({
      success: true,
      data: {
        teacher_id: 9,
        limits: {
          weekly_hours_target: null,
          weekly_hours_max: null,
          daily_hours_max: null,
          max_continuous_minutes: null,
        },
      },
      meta: {},
    });
    const res = await updateTeacherAcademicProfile(9, {
      weekly_hours_target: null,
      weekly_hours_max: null,
      daily_hours_max: null,
      max_continuous_minutes: null,
    });
    expect(mockApi.patch).toHaveBeenCalledWith(
      endpoints.admin.teacherAcademicProfile(9),
      {
        weekly_hours_target: null,
        weekly_hours_max: null,
        daily_hours_max: null,
        max_continuous_minutes: null,
      },
      undefined,
    );
    expect(res.success && res.data.limits?.weekly_hours_target).toBeNull();
  });

  it('parses assignment list/detail and maps end action', async () => {
    mockApi.get
      .mockResolvedValueOnce({
        success: true,
        data: [
          {
            id: 5,
            teacher: { id: 1, name: 'T' },
            allowed_actions: { end: true, suspend: false },
          },
        ],
        meta: { pagination: { page: 1, page_size: 20, total: 1, total_pages: 1 } },
      })
      .mockResolvedValueOnce({
        success: true,
        data: {
          item: {
            id: 5,
            teacher: { id: 1, name: 'T' },
            allowed_actions: { end: true },
          },
        },
        meta: {},
      });
    mockApi.post.mockResolvedValueOnce({
      success: false,
      error: {
        code: 'assignment_overlap',
        message: 'overlap',
        details: {},
      },
      meta: {},
    });

    const list = await fetchTeachingAssignments({ page: 1, state: 'active' });
    const detail = await fetchTeachingAssignment(5);
    const ended = await endTeachingAssignment(5, { reason: 'done' });
    expect(list.success && list.data[0].allowed_actions).toEqual({ end: true });
    expect(detail.success && detail.data.id).toBe(5);
    expect(ended.success).toBe(false);
    expect(!ended.success && ended.error.code).toBe('assignment_overlap');
    expect(mockApi.post).toHaveBeenCalledWith(
      endpoints.admin.teachingAssignmentEnd(5),
      { reason: 'done' },
      undefined,
    );
  });

  it('treats offerings total=0 as valid empty list (archived hidden)', async () => {
    mockApi.get.mockResolvedValueOnce({
      success: true,
      data: [],
      meta: { pagination: { page: 1, page_size: 20, total: 0, total_pages: 1 } },
    });
    const res = await fetchTeachingOfferingsDomain({ page: 1, page_size: 20 });
    expect(res.success && res.data).toEqual([]);
    expect(res.success && res.meta.pagination?.total).toBe(0);
    expect(mockApi.get).toHaveBeenCalledWith(endpoints.admin.teachingOfferings, {
      page: 1,
      page_size: 20,
    });
  });

  it('propagates error envelopes without inventing success', async () => {
    mockApi.get.mockResolvedValueOnce({
      success: false,
      error: { code: 'teacher_access_denied', message: 'denied', details: {} },
      meta: {},
    });
    const res = await fetchTeachers();
    expect(res.success).toBe(false);
    expect(!res.success && res.error.code).toBe('teacher_access_denied');
  });
});
