// @vitest-environment happy-dom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { LocaleProvider } from '@/features/i18n/locale-context';
import { useAnnouncementsList } from '@/features/announcements/hooks/use-announcements-list';
import { RecipientAnnouncementsDashboardSection } from './recipient-announcements-dashboard-section';

vi.mock('@/features/announcements/hooks/use-announcements-list', () => ({
  useAnnouncementsList: vi.fn(() => ({
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
        {
          id: 43,
          content_id: 8,
          school_id: 1,
          subject: 'إعلان ثان',
          priority: 'important',
          is_pinned: false,
          expires_at: null,
          published_at: '2026-08-17T10:00:00Z',
          sent_date: '2026-08-17T10:00:00Z',
          is_read: true,
          sender: { id: 3, name: 'إدارة المؤسسة' },
        },
        {
          id: 44,
          content_id: 9,
          school_id: 1,
          subject: 'إعلان ثالث',
          priority: 'normal',
          is_pinned: true,
          expires_at: null,
          published_at: '2026-08-16T10:00:00Z',
          sent_date: '2026-08-16T10:00:00Z',
          is_read: true,
          sender: { id: 3, name: 'إدارة المؤسسة' },
        },
        {
          id: 45,
          content_id: 10,
          school_id: 1,
          subject: 'إعلان رابع',
          priority: 'normal',
          is_pinned: false,
          expires_at: null,
          published_at: '2026-08-15T10:00:00Z',
          sent_date: '2026-08-15T10:00:00Z',
          is_read: true,
          sender: { id: 3, name: 'إدارة المؤسسة' },
        },
      ],
      page: 1,
      page_size: 3,
      total: 4,
      total_pages: 2,
      unread_count: 1,
    },
    error: null,
    reload: vi.fn(),
    setPage: vi.fn(),
    page: 1,
    patchItem: vi.fn(),
    adjustUnread: vi.fn(),
  })),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('RecipientAnnouncementsDashboardSection', () => {
  it('renders a compact three-item governed inbox with role-scoped routes', () => {
    const { container } = render(
      <LocaleProvider>
        <RecipientAnnouncementsDashboardSection basePath="/teacher/announcements" />
      </LocaleProvider>,
    );

    expect(vi.mocked(useAnnouncementsList)).toHaveBeenCalledWith({ pageSize: 3 });
    expect(screen.getByTestId('recipient-announcements-dashboard')).toBeTruthy();
    expect(screen.getByTestId('recipient-announcements-inbox')).toBeTruthy();
    expect(screen.getAllByTestId('recipient-announcement-inbox-item')).toHaveLength(3);
    expect(screen.getByText('إعلان اختباري')).toBeTruthy();
    expect(screen.getAllByText('إدارة المؤسسة')).toHaveLength(3);
    expect(screen.getByTestId('recipient-announcement-unread-dot')).toBeTruthy();
    expect(screen.queryByText('إعلان رابع')).toBeNull();
    expect(container.querySelector('a[href="/teacher/announcements"]')).toBeTruthy();
    expect(container.querySelector('a[href="/teacher/announcements/42"]')).toBeTruthy();
  });
});
