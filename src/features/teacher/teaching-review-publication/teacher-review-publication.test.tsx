// @vitest-environment happy-dom

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/features/admin/teaching-review-publication/review-publication.css', () => ({}));

const fetchStatus = vi.fn();
const fetchPubs = vi.fn();
const fetchClosure = vi.fn();

vi.mock(
  '@/features/teacher/teaching-review-publication/api/teacher-review-publication-api',
  () => ({
    fetchTeacherReviewStatus: (...args: unknown[]) => fetchStatus(...args),
    fetchTeacherPublications: (...args: unknown[]) => fetchPubs(...args),
    fetchTeacherClosureStatus: (...args: unknown[]) => fetchClosure(...args),
    fetchTeacherDocumentPublications: vi.fn(),
    createTeacherHomeworkCorrection: vi.fn(),
  }),
);

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams('tab=status'),
}));

vi.mock('@/features/i18n/locale-context', () => ({
  useT: () => (key: string) => key,
}));

import { TeacherReviewPublicationPage } from './components/teacher-review-publication-page';

describe('TeacherReviewPublicationPage', () => {
  afterEach(() => {
    cleanup();
  });

  it('shows document-scoped status empty guidance without document ids', async () => {
    fetchStatus.mockResolvedValue({ success: true, data: null });
    fetchPubs.mockResolvedValue({
      success: true,
      data: { items: [], pagination: { page: 1, page_size: 50, total: 0 } },
    });
    fetchClosure.mockResolvedValue({
      success: true,
      data: { closed: false, legacy_closed: false, closure: null },
    });
    render(<TeacherReviewPublicationPage />);
    await waitFor(() => {
      expect(
        screen.getByText('teachingReviewPublication.empty.teacherStatusTitle'),
      ).toBeTruthy();
    });
    expect(fetchStatus).not.toHaveBeenCalled();
  });

  it('does not expose admin approval/archive/close actions', async () => {
    render(<TeacherReviewPublicationPage />);
    await waitFor(() => {
      expect(screen.getAllByText('teacher.teachingReviewPublication.title').length).toBeGreaterThan(0);
    });
    expect(screen.queryByText('teachingReviewPublication.actions.approveOfficial')).toBeNull();
    expect(screen.queryByText('teachingReviewPublication.actions.archive')).toBeNull();
    expect(screen.queryByText('teachingReviewPublication.actions.close')).toBeNull();
    expect(screen.queryByText('teachingReviewPublication.actions.reopen')).toBeNull();
  });
});
