import { beforeEach, describe, expect, it, vi } from 'vitest';

const { post, patch } = vi.hoisted(() => ({
  post: vi.fn(),
  patch: vi.fn(),
}));

vi.mock('@/lib/api/client', () => ({ api: { post, patch } }));

import {
  archiveLibraryTitle,
  buildGeneratedLibraryAccession,
  checkoutLibraryStudent,
  createGeneratedLibraryCopies,
  createLibraryCopy,
  createLibraryTitle,
  returnLibraryLoan,
  runLibraryCopyAction,
  toOdooDateTime,
  updateLibraryCopy,
  updateLibraryTitle,
} from './library-actions';

beforeEach(() => {
  post.mockReset();
  patch.mockReset();
  post.mockResolvedValue({ success: true, data: {}, meta: {} });
  patch.mockResolvedValue({ success: true, data: {}, meta: {} });
});

describe('physical library admin actions', () => {
  it('maps title form fields to Odoo title fields without sending the UI copy count', async () => {
    await createLibraryTitle({ name: '  كتاب  ', authors: ' مؤلف ', publisher: ' ناشر ', isbn: ' 123 ', policy: 'loanable', copiesToAdd: 3 });
    expect(post).toHaveBeenCalledWith('/admin/library/titles', {
      name: 'كتاب', author_names: 'مؤلف', publisher: 'ناشر', isbn: '123', default_circulation_policy: 'loanable',
    });
  });

  it('updates a title through PATCH without sending school_id or copy count', async () => {
    await updateLibraryTitle(7, { name: 'عنوان', authors: '', publisher: '', isbn: '', policy: 'library_only', copiesToAdd: 2 });
    expect(patch).toHaveBeenCalledWith('/admin/library/titles/7', {
      name: 'عنوان', author_names: undefined, publisher: undefined, isbn: undefined, default_circulation_policy: 'library_only',
    });
  });

  it('generates stable internal accession formatting for new physical copies', () => {
    expect(buildGeneratedLibraryAccession(17, 'abc-123', 0)).toBe('RQ-LIB-17-ABC123-01');
    expect(buildGeneratedLibraryAccession(17, 'abc-123', 8)).toBe('RQ-LIB-17-ABC123-09');
  });

  it('creates one physical copy record per requested title copy', async () => {
    post
      .mockResolvedValueOnce({ success: true, data: { id: 101 }, meta: {} })
      .mockResolvedValueOnce({ success: true, data: { id: 102 }, meta: {} });

    const result = await createGeneratedLibraryCopies({ id: 7, default_circulation_policy: 'loanable' }, 2);

    expect(result.success).toBe(true);
    expect(post).toHaveBeenCalledTimes(2);
    for (const call of post.mock.calls) {
      expect(call[0]).toBe('/admin/library/copies');
      expect(call[1]).toMatchObject({ title_id: 7, circulation_policy: 'loanable' });
      expect(String(call[1].accession_code)).toMatch(/^RQ-LIB-7-[A-Z0-9]+-0[12]$/);
    }
  });

  it('stops a generated copy batch on the first backend failure and reports created rows', async () => {
    post
      .mockResolvedValueOnce({ success: true, data: { id: 101 }, meta: {} })
      .mockResolvedValueOnce({ success: false, error: { code: 'library_accession_conflict', message: 'conflict' } });

    const result = await createGeneratedLibraryCopies({ id: 9, default_circulation_policy: 'loanable' }, 3);

    expect(result.success).toBe(false);
    if (!result.success) expect(result.created).toHaveLength(1);
    expect(post).toHaveBeenCalledTimes(2);
  });

  it('archives a title through the lifecycle endpoint', async () => {
    await archiveLibraryTitle(9);
    expect(post).toHaveBeenCalledWith('/admin/library/titles/9/archive');
  });

  it('maps physical copy form fields to immutable copy identity fields', async () => {
    await createLibraryCopy({ titleId: 4, accession: ' A-1 ', barcode: ' B-1 ', shelf: ' R2 ' });
    expect(post).toHaveBeenCalledWith('/admin/library/copies', {
      title_id: 4, accession_code: 'A-1', barcode: 'B-1', shelf_location: 'R2',
    });
  });

  it('edits only mutable physical copy fields and never patches state or immutable identity', async () => {
    await updateLibraryCopy(88, { barcode: ' B-88 ', shelf: ' R4 ', policy: 'library_only', condition: 'worn' });
    expect(patch).toHaveBeenCalledWith('/admin/library/copies/88', {
      barcode: 'B-88', shelf_location: 'R4', circulation_policy: 'library_only', condition: 'worn',
    });
    const payload = patch.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(payload).not.toHaveProperty('state');
    expect(payload).not.toHaveProperty('title_id');
    expect(payload).not.toHaveProperty('accession_code');
  });

  it('clears optional copy barcode and shelf through explicit false values', async () => {
    await updateLibraryCopy(88, { barcode: ' ', shelf: '', policy: 'loanable', condition: 'good' });
    expect(patch).toHaveBeenCalledWith('/admin/library/copies/88', {
      barcode: false, shelf_location: false, circulation_policy: 'loanable', condition: 'good',
    });
  });

  it('uses explicit lifecycle routes instead of direct state PATCH', async () => {
    await runLibraryCopyAction(12, 'mark_damaged');
    expect(post).toHaveBeenCalledWith('/admin/library/copies/12/mark-damaged', undefined);
    expect(patch).not.toHaveBeenCalled();
  });

  it('restores a copy with a valid physical condition', async () => {
    await runLibraryCopyAction(12, 'restore');
    expect(post).toHaveBeenCalledWith('/admin/library/copies/12/restore', { condition: 'good' });
  });

  it('checks out exactly one student identity with due_at', async () => {
    await checkoutLibraryStudent(12, { studentId: 44, dueAt: '2026-09-01T16:30', notes: ' مرجع بحث ' });
    expect(post).toHaveBeenCalledWith('/admin/library/copies/12/checkout', {
      student_id: 44, due_at: '2026-09-01 16:30:00', notes: 'مرجع بحث',
    });
  });

  it('returns through the return endpoint with condition and notes', async () => {
    await returnLibraryLoan(88, { returnCondition: 'damaged', notes: ' غلاف متضرر ' });
    expect(post).toHaveBeenCalledWith('/admin/library/circulations/88/return', {
      return_condition: 'damaged', notes: 'غلاف متضرر',
    });
  });

  it('normalizes datetime-local values for the Odoo contract', () => {
    expect(toOdooDateTime('2026-09-01T16:30')).toBe('2026-09-01 16:30:00');
    expect(toOdooDateTime('2026-09-01 16:30:45')).toBe('2026-09-01 16:30:45');
  });
});
