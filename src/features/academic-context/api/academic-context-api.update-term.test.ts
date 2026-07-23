import { beforeEach, describe, expect, it, vi } from 'vitest';

const patch = vi.fn();
const post = vi.fn();

vi.mock('@/lib/api/client', () => ({
  api: {
    get: vi.fn(),
    post: (...args: unknown[]) => post(...args),
    patch: (...args: unknown[]) => patch(...args),
  },
}));

import {
  createAcademicTerm,
  sanitizeTermCreatePayload,
  sanitizeTermUpdatePayload,
  updateAcademicTerm,
} from '@/features/academic-context/api/academic-context-api';
import { endpoints } from '@/lib/api/endpoints';
import type { CreateAcademicTermInput } from '@/types/academic-context';

describe('sanitizeTermUpdatePayload', () => {
  it('keeps only allowed keys', () => {
    expect(
      sanitizeTermUpdatePayload({
        name: 'A',
        code: 'T1',
        date_start: '2026-09-01',
        date_end: '2027-01-15',
        // @ts-expect-error intentional forbidden keys
        state: 'active',
        school_id: 9,
        academic_year_id: 1,
        active: true,
      }),
    ).toEqual({
      name: 'A',
      code: 'T1',
      date_start: '2026-09-01',
      date_end: '2027-01-15',
    });
  });

  it('returns null for empty payload', () => {
    expect(sanitizeTermUpdatePayload({})).toBeNull();
  });
});

describe('updateAcademicTerm', () => {
  beforeEach(() => {
    patch.mockReset();
  });

  it('PATCHes academic-setup term path with allowed fields only', async () => {
    patch.mockResolvedValue({
      success: true,
      data: {
        id: 31,
        name: 'Updated',
        code: 'T1',
        date_start: '2026-09-01',
        date_end: '2027-01-15',
        state: 'draft',
        allowed_actions: { edit: true },
      },
      meta: {},
    });

    const res = await updateAcademicTerm(31, {
      name: 'Updated',
      // @ts-expect-error ensure sanitizer drops forbidden keys
      state: 'active',
      school_id: 3,
      academic_year_id: 9,
      active: false,
    });

    expect(patch).toHaveBeenCalledTimes(1);
    expect(patch.mock.calls[0][0]).toBe(endpoints.admin.academicSetupTerm(31));
    expect(patch.mock.calls[0][1]).toEqual({ name: 'Updated' });
    expect(patch.mock.calls[0][1]).not.toHaveProperty('state');
    expect(patch.mock.calls[0][1]).not.toHaveProperty('school_id');
    expect(patch.mock.calls[0][1]).not.toHaveProperty('academic_year_id');
    expect(patch.mock.calls[0][1]).not.toHaveProperty('active');
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.name).toBe('Updated');
      expect(res.data.allowed_actions?.edit).toBe(true);
    }
  });

  it('preserves error envelope and status details from Odoo', async () => {
    patch.mockResolvedValue({
      success: false,
      error: {
        code: 'term_dates_invalid',
        message: 'invalid',
        details: { status: 422 },
      },
      meta: {},
    });

    const res = await updateAcademicTerm(31, { date_start: '2027-06-01', date_end: '2027-01-01' });
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.code).toBe('term_dates_invalid');
      expect(res.error.details?.status).toBe(422);
    }
  });

  it('does not treat Odoo denial as success', async () => {
    patch.mockResolvedValue({
      success: false,
      error: {
        code: 'term_edit_not_allowed',
        message: 'denied',
        details: { status: 403 },
      },
      meta: {},
    });
    const res = await updateAcademicTerm(31, { name: 'X' });
    expect(res.success).toBe(false);
    if (!res.success) expect(res.error.code).toBe('term_edit_not_allowed');
  });

  it('rejects empty client payload without calling API', async () => {
    const res = await updateAcademicTerm(31, {});
    expect(patch).not.toHaveBeenCalled();
    expect(res.success).toBe(false);
    if (!res.success) expect(res.error.code).toBe('invalid_term_field');
  });
});

describe('createAcademicTerm', () => {
  beforeEach(() => {
    post.mockReset();
  });

  it('rejects forbidden keys and POSTs clean payload to year terms path', async () => {
    const dirty = Object.assign(
      {
        name: 'New',
        code: 'TX',
        date_start: '2026-09-01',
        date_end: '2026-12-31',
      },
      { school_id: 5 },
    ) as CreateAcademicTermInput;
    expect(sanitizeTermCreatePayload(dirty)).toBeNull();

    const rejected = await createAcademicTerm(12, dirty);
    expect(rejected.success).toBe(false);
    expect(post).not.toHaveBeenCalled();

    post.mockResolvedValue({
      success: true,
      data: {
        id: 99,
        name: 'New',
        code: 'TX',
        date_start: '2026-09-01',
        date_end: '2026-12-31',
        state: 'draft',
      },
      meta: {},
    });

    const ok = await createAcademicTerm(12, {
      name: 'New',
      code: 'TX',
      date_start: '2026-09-01',
      date_end: '2026-12-31',
    });
    expect(post).toHaveBeenCalledTimes(1);
    expect(post.mock.calls[0][0]).toBe(endpoints.admin.academicYearTerms(12));
    expect(post.mock.calls[0][1]).toEqual({
      name: 'New',
      code: 'TX',
      date_start: '2026-09-01',
      date_end: '2026-12-31',
    });
    expect(ok.success).toBe(true);
  });

  it('preserves create API errors without fake success', async () => {
    post.mockResolvedValue({
      success: false,
      error: {
        code: 'term_dates_invalid',
        message: 'invalid',
        details: { status: 422 },
      },
      meta: {},
    });
    const res = await createAcademicTerm(12, {
      name: 'New',
      code: 'TX',
      date_start: '2027-01-01',
      date_end: '2026-01-01',
    });
    expect(res.success).toBe(false);
    if (!res.success) expect(res.error.code).toBe('term_dates_invalid');
  });
});
