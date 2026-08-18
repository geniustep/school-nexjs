// @vitest-environment happy-dom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { LocaleProvider } from '@/features/i18n/locale-context';
import { RecipientAnnouncementsDashboardSection } from './recipient-announcements-dashboard-section';

vi.mock('@/features/announcements/hooks/use-announcements-list', () => ({
  useAnnouncementsList: () => ({
    loading: false,
    initialLoading: false,
    fetching: false,
    data: {
      items: [
        {
          id: 42,
          content_id: 7,
          school_id: 1,
          subject: 'إعلان اختباري',
          priority: 'normal',
          is_pinned: false,
          expires_at: null,
          published_at: '2026-08-18T10:00:00Z',
          sent_date: '2026-08-18T10:00:00Z',
          is_read: false,
          sender: { id: 3, name: 'إدارة المؤسسة' },
        },
      ],
      page: 1,
      page_size: 5,
      total: 1,
      total_pages: 1,
      unread_count: 1,
    },
    error: null,
    reload: vi.fn(),
    setPage: vi.fn(),
    page: 1,
    patchItem: vi.fn(),
    adjustUnread: vi.fn(),
  }),
}));

afterEach(cleanup);

describe('RecipientAnnouncementsDashboardSection', () => {
  it('renders the governed recipient preview and role-scoped routes', () => {
    const { container } = render(
      <LocaleProvider>
        <RecipientAnnouncementsDashboardSection basePath="/teacher/announcements" />
      </LocaleProvider>,
    );

    expect(screen.getByTestId('recipient-announcements-dashboard')).toBeTruthy();
    expect(screen.getByText('إعلان اختباري')).toBeTruthy();
    expect(screen.getByText('إدارة المؤسسة')).toBeTruthy();
    expect(container.querySelector('a[href="/teacher/announcements"]')).toBeTruthy();
    expect(container.querySelector('a[href="/teacher/announcements/42"]')).toBeTruthy();
  });
});
