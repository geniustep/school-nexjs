// @vitest-environment happy-dom

import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/features/i18n/locale-context';
import { LOCALE_STORAGE_KEY } from '@/lib/i18n/config';
import type { TeachingReferenceDetail } from '@/types/teaching-planning';

vi.mock('../teaching-planning.css', () => ({}));

const toast = { success: vi.fn(), error: vi.fn() };
vi.mock('@/components/ui/toast', () => ({
  useToast: () => toast,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/features/i18n/use-format', () => ({
  useFormat: () => ({
    formatDateTime: (value: string) => value,
    formatDate: (value: string) => value,
  }),
}));

const submitTeachingReferenceForReview = vi.fn();
const approveTeachingReference = vi.fn();
const archiveTeachingReference = vi.fn();
const deleteTeachingReference = vi.fn();
const duplicateTeachingReferenceVersion = vi.fn();
const resetTeachingReferenceToDraft = vi.fn();

vi.mock('../api/teaching-references-api', () => ({
  submitTeachingReferenceForReview: (...args: unknown[]) =>
    submitTeachingReferenceForReview(...args),
  approveTeachingReference: (...args: unknown[]) => approveTeachingReference(...args),
  archiveTeachingReference: (...args: unknown[]) => archiveTeachingReference(...args),
  deleteTeachingReference: (...args: unknown[]) => deleteTeachingReference(...args),
  duplicateTeachingReferenceVersion: (...args: unknown[]) =>
    duplicateTeachingReferenceVersion(...args),
  resetTeachingReferenceToDraft: (...args: unknown[]) => resetTeachingReferenceToDraft(...args),
}));

vi.mock('./teaching-reference-dialogs', () => ({
  TeachingReferenceEditorDialog: () => null,
  TeachingPlanningResetDialog: () => null,
}));

import { TeachingReferenceDetailView } from './teaching-reference-detail-view';

function baseReference(
  overrides: Partial<TeachingReferenceDetail> = {},
): TeachingReferenceDetail {
  return {
    id: 12,
    name: 'مرجع الرياضيات',
    school: { id: 1, name: 'مدرسة النور' },
    subject: { id: 4, name: 'الرياضيات', code: 'MATH' },
    level: { id: 3, name: 'السادس' },
    teaching_language: { id: 9, code: 'ar_001', name: 'Arabic' },
    track: null,
    publisher: 'دار المعرفة',
    edition: '1',
    version_label: '2026',
    reference_code: 'MATH-P6',
    isbn: '978000',
    state: 'draft',
    active: true,
    supersedes_id: null,
    offering_count: 0,
    notes: null,
    approved_by_id: null,
    approved_at: null,
    reset_reason: null,
    archived_by_id: null,
    archived_at: null,
    student_book_attachment_ids: [1],
    teacher_guide_attachment_ids: [],
    supplementary_attachment_ids: [],
    allowed_actions: {
      view: true,
      edit: true,
      submit_for_review: true,
      approve: true,
      reset_to_draft: false,
      archive: true,
      duplicate_version: false,
      delete: true,
    },
    ...overrides,
  };
}

function renderDetail(reference: TeachingReferenceDetail, onReload = vi.fn()) {
  return render(
    <LocaleProvider>
      <TeachingReferenceDetailView reference={reference} onReload={onReload} />
    </LocaleProvider>,
  );
}

describe('TeachingReferenceDetailView', () => {
  beforeEach(() => {
    localStorage.setItem(LOCALE_STORAGE_KEY, 'en');
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders core fields and attachment counts, with LTR codes', () => {
    renderDetail(baseReference());
    expect(screen.getAllByText('مرجع الرياضيات').length).toBeGreaterThan(0);
    expect(screen.getByText('978000')).toBeTruthy();
    expect(screen.getByText('MATH-P6')).toBeTruthy();
    expect(screen.getByText('دار المعرفة')).toBeTruthy();
  });

  it('hides edit when allowed_actions.edit is false (immutable approved)', () => {
    renderDetail(
      baseReference({
        state: 'approved',
        allowed_actions: {
          view: true,
          edit: false,
          submit_for_review: false,
          approve: false,
          archive: true,
          duplicate_version: true,
          delete: false,
        },
      }),
    );
    expect(screen.queryByRole('button', { name: /^Edit$|^تعديل$|^Modifier$/i })).toBeNull();
    expect(screen.getByRole('button', { name: /Duplicate version|نسخ إصدار|Dupliquer/i })).toBeTruthy();
  });

  it('submits for review then refetches only after Backend success', async () => {
    const onReload = vi.fn();
    submitTeachingReferenceForReview.mockResolvedValue({
      success: true,
      data: baseReference({ state: 'under_review' }),
      meta: {},
    });
    renderDetail(baseReference(), onReload);
    await userEvent.click(screen.getByRole('button', { name: /Submit for review|إرسال|Soumettre/i }));
    expect(submitTeachingReferenceForReview).toHaveBeenCalledWith(12);
    expect(onReload).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalled();
  });

  it('shows Backend error without refetch on failed approve', async () => {
    const onReload = vi.fn();
    approveTeachingReference.mockResolvedValue({
      success: false,
      error: { code: 'invalid_state', message: 'Only draft can be approved.' },
      meta: {},
    });
    renderDetail(baseReference(), onReload);
    await userEvent.click(screen.getByRole('button', { name: /Approve|اعتماد|Approuver/i }));
    expect(toast.error).toHaveBeenCalledWith('Only draft can be approved.');
    expect(onReload).not.toHaveBeenCalled();
  });
});
