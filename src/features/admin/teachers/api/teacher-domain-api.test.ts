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
