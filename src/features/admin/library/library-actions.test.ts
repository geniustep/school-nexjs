import { beforeEach, describe, expect, it, vi } from 'vitest';

const { post, patch } = vi.hoisted(() => ({
  post: vi.fn(),
  patch: vi.fn(),
}));

vi.mock('@/lib/api/client', () => ({ api: { post, patch } }));

import {
  archiveLibraryTitle,
  checkoutLibraryStudent,
  createLibraryCopy,
  createLibraryTitle,
  returnLibraryLoan,
  runLibraryCopyAction,
  toOdooDateTime,
  updateLibraryTitle,
} from './library-actions';

beforeEach(() => {
  post.mockReset();
  patch.mockReset();
  post.mockResolvedValue({ success: true, data: {}, meta: {} });
  patch.mockResolvedValue({ success: true, data: {}, meta: {} });
});

describe('physical library admin actions', () => {
  it('maps title form fields to Odoo title fields', async () => {
    await createLibraryTitle({ name: '  كتاب  ', authors: ' مؤلف ', publisher: ' ناشر ', isbn: ' 123 ', policy: 'loanable' });
    expect(post).toHaveBeenCalledWith('/admin/library/titles', {
      name: 'كتاب', author_names: 'مؤلف', publisher: 'ناشر', isbn: '123', default_circulation_policy: 'loanable',
    });
  });

  it('updates a title through PATCH without sending school_id', async () => {
    await updateLibraryTitle(7, { name: 'عنوان', authors: '', publisher: '', isbn: '', policy: 'library_only' });
    expect(patch).toHaveBeenCalledWith('/admin/library/titles/7', {
      name: 'عنوان', author_names: undefined, publisher: undefined, isbn: undefined, default_circulation_policy: 'library_only',
    });
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
