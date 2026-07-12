import { describe, expect, it, vi, beforeEach } from 'vitest';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import {
  confirmAdminDiagnosticAssessment,
  createAdminDiagnosticAssessment,
  fetchAdminDiagnosticAssessment,
  fetchTeacherDiagnosticPrint,
  patchAdminDiagnosticLines,
  patchTeacherDiagnosticLines,
} from '../api/diagnostic-assessment-api';

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

describe('diagnostic-assessment-api adapters', () => {
  it('fetches admin detail and normalizes allowed_actions + completion', async () => {
    mockApi.get.mockResolvedValueOnce({
      success: true,
      data: {
        id: 28,
        state: 'draft',
        completion: {
          students_total: 2,
          scored_count: 1,
          absent_count: 0,
          incomplete_count: 0,
          not_entered_count: 1,
          resolved_count: 1,
          completion_percent: 50,
          average_score: 8,
          score_distribution: { '8': 1 },
        },
        allowed_actions: ['edit_lines', 'confirm'],
        score_scale: [{ score: 8, phrase: 'جيد جدًا' }],
        lines: [
          {
            id: 32,
            roster_sequence: 1,
            student: { id: 1, name: 'A' },
            participation_state: 'scored',
            score: 8,
            phrase: 'جيد جدًا',
            teacher_note: null,
          },
        ],
      },
      meta: {},
    });

    const res = await fetchAdminDiagnosticAssessment(28);
    expect(mockApi.get).toHaveBeenCalledWith(endpoints.admin.diagnosticAssessment(28), undefined);
    expect(res.success && res.data?.allowed_actions).toEqual({
      edit_lines: true,
      confirm: true,
    });
    expect(res.success && res.data?.completion.score_distribution['8']).toBe(1);
    expect(res.success && res.data?.completion.score_distribution['1']).toBe(0);
  });

  it('creates campaign on admin collection endpoint', async () => {
    mockApi.post.mockResolvedValueOnce({
      success: true,
      data: {
        id: 29,
        state: 'draft',
        completion: {
          students_total: 0,
          scored_count: 0,
          absent_count: 0,
          incomplete_count: 0,
          not_entered_count: 0,
          resolved_count: 0,
          completion_percent: 0,
          average_score: 0,
          score_distribution: {},
        },
        allowed_actions: { edit_lines: true },
        score_scale: [],
        lines: [],
      },
      meta: {},
    });

    const payload = {
      academic_year_id: 1,
      class_id: 10,
      subject_id: 20,
      name: 'Diag',
    };
    const res = await createAdminDiagnosticAssessment(payload);
    expect(mockApi.post).toHaveBeenCalledWith(
      endpoints.admin.diagnosticAssessments,
      payload,
      undefined,
    );
    expect(res.success && res.data?.id).toBe(29);
  });

  it('patches lines with lines payload (not entries)', async () => {
    mockApi.patch.mockResolvedValueOnce({
      success: true,
      data: {
        updated_count: 1,
        lines: [
          {
            id: 32,
            roster_sequence: 1,
            student: { id: 1, name: 'A' },
            participation_state: 'scored',
            score: 7,
            phrase: 'جيد',
            teacher_note: 'ok',
          },
        ],
        completion: {
          students_total: 1,
          scored_count: 1,
          absent_count: 0,
          incomplete_count: 0,
          not_entered_count: 0,
          resolved_count: 1,
          completion_percent: 100,
          average_score: 7,
          score_distribution: { '7': 1 },
        },
      },
      meta: {},
    });

    const payload = { lines: [{ id: 32, score: 7, teacher_note: 'ok' }] };
    const res = await patchAdminDiagnosticLines(28, payload);
    expect(mockApi.patch).toHaveBeenCalledWith(
      endpoints.admin.diagnosticAssessmentLines(28),
      payload,
      undefined,
    );
    expect(res.success && res.data?.lines[0]?.phrase).toBe('جيد');
  });

  it('uses teacher endpoints for teacher patch and print', async () => {
    mockApi.patch.mockResolvedValueOnce({
      success: true,
      data: {
        updated_count: 0,
        lines: [],
        completion: {
          students_total: 0,
          scored_count: 0,
          absent_count: 0,
          incomplete_count: 0,
          not_entered_count: 0,
          resolved_count: 0,
          completion_percent: 0,
          average_score: null,
          score_distribution: {},
        },
      },
      meta: {},
    });
    mockApi.get.mockResolvedValueOnce({
      success: true,
      data: {
        assessment: { id: 28, title: 'T', state: 'draft' },
        score_scale: [],
        summary: {
          students_total: 0,
          scored_count: 0,
          absent_count: 0,
          incomplete_count: 0,
          not_entered_count: 0,
          resolved_count: 0,
          completion_percent: 0,
          average_score: null,
          score_distribution: {},
        },
        lines: [],
      },
      meta: {},
    });

    await patchTeacherDiagnosticLines(28, { lines: [] });
    expect(mockApi.patch).toHaveBeenCalledWith(
      endpoints.teacher.diagnosticAssessmentLines(28),
      { lines: [] },
      undefined,
    );

    const print = await fetchTeacherDiagnosticPrint(28);
    expect(mockApi.get).toHaveBeenCalledWith(
      endpoints.teacher.diagnosticAssessmentPrint(28),
      undefined,
    );
    expect(print.success && print.data?.assessment.id).toBe(28);
  });

  it('posts confirm to dedicated endpoint', async () => {
    mockApi.post.mockResolvedValueOnce({
      success: true,
      data: {
        id: 28,
        state: 'confirmed',
        completion: {
          students_total: 1,
          scored_count: 1,
          absent_count: 0,
          incomplete_count: 0,
          not_entered_count: 0,
          resolved_count: 1,
          completion_percent: 100,
          average_score: 8,
          score_distribution: {},
        },
        allowed_actions: { reset_to_draft: true },
        score_scale: [],
        lines: [],
      },
      meta: {},
    });

    const res = await confirmAdminDiagnosticAssessment(28);
    expect(mockApi.post).toHaveBeenCalledWith(
      endpoints.admin.diagnosticAssessmentConfirm(28),
      undefined,
      undefined,
    );
    expect(res.success && res.data?.state).toBe('confirmed');
  });
});
