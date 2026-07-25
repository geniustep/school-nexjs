import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createReferenceSubject } from './reference-subject-create-api';
import type { ReferenceSubjectCreateRequest } from '@/types/reference-subjects';

const postMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/api/client', () => ({
  api: {
    post: (...args: unknown[]) => postMock(...args),
  },
}));

const payload: ReferenceSubjectCreateRequest = {
  name: 'نشاط',
  code: 'ACT1',
  cycle_id: 1,
  level_ids: [101],
  subject_category: 'other',
  is_mandatory_default: false,
  is_optional_default: true,
  weekly_sessions_default: 0,
  external_reference_code: null,
  source_note: 'created_from_platform_admin',
  active: true,
};

describe('createReferenceSubject', () => {
  beforeEach(() => {
    postMock.mockReset();
  });

  it('posts to referenceSubjects and returns created data on 201 envelope', async () => {
    postMock.mockResolvedValue({
      success: true,
      data: {
        id: 9,
        ...payload,
        cycle: { id: 1, code: 'PRE', name: 'أولي' },
        levels: [{ id: 101, code: 'PRE1', name: 'الأولى' }],
        active: true,
        scope: 'global_reference_catalog',
      },
      meta: {},
    });

    const result = await createReferenceSubject(payload);
    expect(postMock).toHaveBeenCalledWith('/admin/reference-subjects', payload);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.scope).toBe('global_reference_catalog');
    expect(postMock).toHaveBeenCalledTimes(1);
  });

  it('preserves error codes without calling enable', async () => {
    postMock.mockResolvedValue({
      success: false,
      error: { code: 'reference_subject_code_conflict', message: 'conflict', details: { status: 409 } },
      meta: {},
    });
    const result = await createReferenceSubject(payload);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('reference_subject_code_conflict');
    expect(postMock.mock.calls.every((c) => String(c[0]).includes('enable'))).toBe(false);
  });
});
