// @vitest-environment happy-dom

import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/features/admin/teaching-review-publication/review-publication.css', () => ({}));
vi.mock('@/features/admin/teaching-planning/teaching-planning.css', () => ({}));
vi.mock('@/features/admin/teaching-planning/teaching-planning-list.css', () => ({}));

const fetchQueue = vi.fn();
vi.mock(
  '@/features/admin/teaching-review-publication/api/admin-review-publication-api',
  () => ({
    fetchAdminReviewQueue: (...args: unknown[]) => fetchQueue(...args),
    fetchAdminArchive: vi.fn(async () => ({
      success: true,
      data: { items: [], pagination: { page: 1, page_size: 50, total: 0 } },
    })),
    fetchPeriodClosures: vi.fn(async () => ({
      success: true,
      data: { items: [], pagination: { page: 1, page_size: 50, total: 0 } },
    })),
    fetchDocumentVersions: vi.fn(),
    markDocumentReviewed: vi.fn(),
    requestDocumentChanges: vi.fn(),
    approveDocumentOfficial: vi.fn(),
    archivePublication: vi.fn(),
    createTeachingExport: vi.fn(),
    fetchExportStatus: vi.fn(),
    fetchPeriodClosurePreview: vi.fn(),
    closeTeachingPeriod: vi.fn(),
    reopenTeachingPeriod: vi.fn(),
    fetchClosureEvents: vi.fn(),
    fetchPeriodExceptions: vi.fn(),
    authorizePeriodException: vi.fn(),
  }),
);

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => '/admin/teaching-planning/review-publication',
  useSearchParams: () => new URLSearchParams('tab=queue'),
}));

vi.mock('@/features/auth/session-context', () => ({
  useSession: () => ({
    id: 1,
    role: 'admin',
    effective_capabilities: [
      'teaching.review.view',
      'teaching.review.manage',
      'teaching.review.approve',
      'teaching.planning.view',
    ],
    school: { id: 1, name: 'School' },
  }),
}));

vi.mock('@/features/i18n/locale-context', () => ({
  useT: () => (key: string) => key,
}));

vi.mock('@/features/academic-context', () => ({
  AcademicContextFilters: () => <div data-testid="academic-filters" />,
}));

vi.mock('@/features/admin/teaching-planning/components/require-teaching-planning', () => ({
  RequireTeachingPlanningAccess: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

vi.mock('@/features/admin/teaching-planning/components/teaching-planning-list-back', () => ({
  TeachingPlanningListBack: () => <div />,
}));

import { AdminReviewPublicationPage } from './components/admin-review-publication-page';

describe('AdminReviewPublicationPage', () => {
  beforeEach(() => {
    fetchQueue.mockReset();
  });

  it('shows empty queue state', async () => {
    fetchQueue.mockResolvedValue({
      success: true,
      data: {
        items: [],
        pagination: { page: 1, page_size: 50, total: 0 },
        counts: {
          by_document_type: {},
          pending_review: 0,
          correction_requested: 0,
          reviewed_not_officially_published: 0,
          officially_published: 0,
          zero_state: true,
        },
      },
    });
    render(<AdminReviewPublicationPage />);
    await waitFor(() => {
      expect(
        screen.getByText('teachingReviewPublication.empty.queueTitle'),
      ).toBeTruthy();
    });
  });

  it('shows 403 permission state for forbidden queue', async () => {
    fetchQueue.mockResolvedValue({
      success: false,
      error: { code: 'permission_denied', message: 'denied' },
    });
    render(<AdminReviewPublicationPage />);
    await waitFor(() => {
      expect(screen.getByText('errors.forbiddenTitle')).toBeTruthy();
    });
  });
});
