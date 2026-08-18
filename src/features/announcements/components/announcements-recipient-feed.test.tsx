// @vitest-environment happy-dom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { LocaleProvider } from '@/features/i18n/locale-context';
import { AnnouncementsRecipientFeed } from './announcements-recipient-feed';

vi.mock('@/features/announcements/hooks/use-announcements-list', () => ({
  useAnnouncementsList: () => ({
    loading: false,
    initialLoading: false,
    fetching: false,
    data: {
      items: [
        {
          id: 91,
          content_id: 501,
          school_id: 1,
          subject: 'رسالة جديدة للأسرة',
          priority: 'important',
          is_pinned: false,
          expires_at: null,
          published_at: '2026-08-18T12:30:00Z',
          sent_date: '2026-08-18T12:30:00Z',
          is_read: false,
          sender: { id: 3, name: 'إدارة المؤسسة' },
        },
        {
          id: 90,
          content_id: 500,
          school_id: 1,
          subject: 'إعلان سابق',
          priority: 'normal',
          is_pinned: false,
          expires_at: null,
          published_at: '2026-08-17T10:00:00Z',
          sent_date: '2026-08-17T10:00:00Z',
          is_read: true,
          sender: { id: 4, name: 'الإدارة التربوية' },
        },
      ],
      page: 1,
      page_size: 12,
      total: 2,
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

describe('AnnouncementsRecipientFeed', () => {
  it('renders a compact readable recipient inbox with read state and detail routes', () => {
    const { container } = render(
      <LocaleProvider>
        <AnnouncementsRecipientFeed
          basePath="/parent/announcements"
          subtitle="الإعلانات المنشورة الموجهة إليك كولي أمر"
        />
      </LocaleProvider>,
    );

    expect(screen.getByTestId('recipient-announcements-feed')).toBeTruthy();
    expect(screen.getByText('رسالة جديدة للأسرة')).toBeTruthy();
    expect(screen.getByText('إعلان سابق')).toBeTruthy();
    expect(screen.getByText('إدارة المؤسسة')).toBeTruthy();
    expect(container.querySelector('a[href="/parent/announcements/91"]')).toBeTruthy();
    expect(container.querySelector('a[href="/parent/announcements/90"]')).toBeTruthy();
    expect(container.querySelector('[data-read="false"]')).toBeTruthy();
    expect(container.querySelector('[data-read="true"]')).toBeTruthy();
  });
});
