import { describe, expect, it, vi, beforeEach } from 'vitest';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import {
  fetchAdminGradebook,
  fetchTeacherGradebook,
  getGradebookResults,
  patchAdminGradebookEntries,
  patchTeacherGradebookEntries,
  postAdminGradebookLifecycle,
  submitTeacherGradebook,
} from '../api/gradebooks-api';

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

describe('gradebooks-api adapters', () => {
  it('fetches detail from admin endpoint and normalizes allowed_actions', async () => {
    mockApi.get.mockResolvedValueOnce({
      success: true,
      data: {
        id: 7,
        context: { state: 'open' },
        structure: { mode: 'simple', slots: [], cells: [] },
        roster: [],
        matrix: [],
        completion: {
          completion_percent: 0,
          unresolved_entries: 0,
          students_total: 0,
          cells_total: 0,
        },
        allowed_actions: ['open', 'submit'],
      },
      meta: {},
    });

    const res = await fetchAdminGradebook(7);
    expect(mockApi.get).toHaveBeenCalledWith(endpoints.admin.gradebook(7), undefined);
    expect(res.success && res.data?.allowed_actions).toEqual({ open: true, submit: true });
  });

  it('patches batch entries endpoint', async () => {
    mockApi.patch.mockResolvedValueOnce({
      success: true,
      data: {
        completion: {
          completion_percent: 80,
          unresolved_entries: 2,
          students_total: 10,
          cells_total: 20,
        },
      },
      meta: {},
    });

    const payload = {
      entries: [{ student_line_id: 1, cell_id: 11, score: 8, score_is_set: true, participation_state: 'taken' as const }],
    };
    const res = await patchAdminGradebookEntries(7, payload);
    expect(mockApi.patch).toHaveBeenCalledWith(endpoints.admin.gradebookEntries(7), payload, undefined);
    expect(res.success && res.data?.completion.completion_percent).toBe(80);
  });

  it('posts lifecycle actions to dedicated endpoints', async () => {
    mockApi.post.mockResolvedValueOnce({
      success: true,
      data: {
        id: 7,
        context: { state: 'submitted' },
        structure: { mode: 'simple', slots: [], cells: [] },
        roster: [],
        matrix: [],
        completion: {
          completion_percent: 100,
          unresolved_entries: 0,
          students_total: 1,
          cells_total: 1,
        },
        allowed_actions: { validate: true },
      },
      meta: {},
    });

    await postAdminGradebookLifecycle(7, 'submit');
    expect(mockApi.post).toHaveBeenCalledWith(endpoints.admin.gradebookSubmit(7), undefined, undefined);
  });

  it('fetches teacher detail from teacher endpoint', async () => {
    mockApi.get.mockResolvedValueOnce({
      success: true,
      data: {
        id: 9,
        context: { state: 'open' },
        structure: { mode: 'composite', slots: [], cells: [], components: [] },
        roster: [],
        matrix: [],
        completion: {
          completion_percent: 10,
          unresolved_entries: 5,
          students_total: 5,
          cells_total: 10,
        },
        allowed_actions: { edit_entries: true, submit: true },
      },
      meta: {},
    });

    const res = await fetchTeacherGradebook(9);
    expect(mockApi.get).toHaveBeenCalledWith(endpoints.teacher.gradebook(9), undefined);
    expect(res.success && res.data?.structure.mode).toBe('composite');
  });

  it('patches batch entries via teacher endpoint', async () => {
    mockApi.patch.mockResolvedValueOnce({
      success: true,
      data: {
        completion: {
          completion_percent: 50,
          unresolved_entries: 4,
          students_total: 8,
          cells_total: 8,
        },
      },
      meta: {},
    });

    const payload = {
      entries: [
        {
          student_line_id: 2,
          cell_id: 20,
          score: 0,
          score_is_set: true,
          participation_state: 'taken' as const,
        },
      ],
    };
    await patchTeacherGradebookEntries(9, payload);
    expect(mockApi.patch).toHaveBeenCalledWith(
      endpoints.teacher.gradebookEntries(9),
      payload,
      undefined,
    );
  });

  it('submits teacher gradebook via teacher endpoint', async () => {
    mockApi.post.mockResolvedValueOnce({
      success: true,
      data: {
        id: 9,
        context: { state: 'submitted' },
        structure: { mode: 'simple', slots: [], cells: [] },
        roster: [],
        matrix: [],
        completion: {
          completion_percent: 100,
          unresolved_entries: 0,
          students_total: 1,
          cells_total: 1,
        },
        allowed_actions: { edit_entries: false },
      },
      meta: {},
    });

    const res = await submitTeacherGradebook(9);
    expect(mockApi.post).toHaveBeenCalledWith(
      endpoints.teacher.gradebookSubmit(9),
      undefined,
      undefined,
    );
    expect(res.success && res.data?.allowed_actions).toEqual({ edit_entries: false });
  });

  it('selects admin Results endpoint for admin role', async () => {
    mockApi.get.mockResolvedValueOnce({
      success: true,
      data: {
        gradebook_id: 223,
        state: 'open',
        mode: 'simple',
        scheme_id: 129,
        scheme_version: 1,
        students: [],
      },
      meta: {},
    });

    const res = await getGradebookResults({ role: 'admin', gradebookId: 223 });
    expect(mockApi.get).toHaveBeenCalledWith(endpoints.admin.gradebookResults(223), undefined);
    expect(res.success && res.data?.gradebook_id).toBe(223);
  });

  it('selects teacher Results endpoint for teacher role', async () => {
    mockApi.get.mockResolvedValueOnce({
      success: true,
      data: {
        gradebook_id: 223,
        state: 'open',
        mode: 'simple',
        scheme_id: 129,
        scheme_version: 1,
        students: [
          {
            student_line_id: 240,
            student_id: 1705,
            cells: [],
            slots: [],
            aggregate: {
              status: 'available',
              score: null,
              max_score: null,
              normalized_score: null,
              completed_cells: 0,
              expected_cells: 2,
              included_cells: 0,
              missing_cells: 2,
              blocking_cells: 0,
            },
          },
        ],
      },
      meta: {},
    });

    const res = await getGradebookResults({ role: 'teacher', gradebookId: 223 });
    expect(mockApi.get).toHaveBeenCalledWith(endpoints.teacher.gradebookResults(223), undefined);
    expect(res.success && res.data?.students).toHaveLength(1);
    expect(res.success && res.data?.students[0]?.aggregate.missing_cells).toBe(2);
  });
});
