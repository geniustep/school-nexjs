/** @vitest-environment happy-dom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const listMock = vi.fn();
const detailMock = vi.fn();
const markMock = vi.fn();
const downloadMock = vi.fn();

vi.mock('@/features/announcements/api/announcements-api', () => ({
  fetchAnnouncementList: (...args: unknown[]) => listMock(...args),
  fetchAnnouncementDetail: (...args: unknown[]) => detailMock(...args),
  markAnnouncementRead: (...args: unknown[]) => markMock(...args),
  downloadAnnouncementAttachment: (...args: unknown[]) => downloadMock(...args),
}));

vi.mock('@/features/auth/active-role-context', () => ({
  useActiveRole: () => ({
    activeRole: 'student',
    availableRoles: [],
    showSwitcher: false,
    switching: false,
    error: null,
    clearError: () => undefined,
    switchRole: async () => false,
  }),
}));

vi.mock('@/features/i18n/locale-context', () => ({
  useT: () => (key: string, params?: Record<string, string | number>) => {
    if (params?.count != null) return `${key}:${params.count}`;
    return key;
  },
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/student/announcements',
}));

import { AnnouncementsRecipientFeed } from '@/features/announcements/components/announcements-recipient-feed';
import { AnnouncementRecipientDetail } from '@/features/announcements/components/announcement-recipient-detail';

describe('announcements recipient UI', () => {
  beforeEach(() => {
    listMock.mockReset();
    detailMock.mockReset();
    markMock.mockReset();
    downloadMock.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders list with unread semantics and no audience fields', async () => {
    listMock.mockResolvedValue({
      ok: true,
      data: {
        items: [
          {
            id: 1,
            content_id: 9,
            school_id: 1,
            subject: 'تنبيه هام',
            priority: 'important',
            is_pinned: true,
            expires_at: null,
            published_at: '2026-07-28T10:00:00',
            sent_date: null,
            is_read: false,
            sender: { id: 2, name: 'الإدارة' },
          },
        ],
        page: 1,
        page_size: 20,
        total: 1,
        total_pages: 1,
        unread_count: 1,
      },
    });

    render(<AnnouncementsRecipientFeed basePath="/student/announcements" />);

    await waitFor(() => {
      expect(screen.getByText('تنبيه هام')).toBeTruthy();
    });
    expect(screen.getByText('announcements.pinned')).toBeTruthy();
    expect(screen.getByText('announcements.priorityImportant')).toBeTruthy();
    expect(screen.getByLabelText(/announcements.unread/)).toBeTruthy();
    expect(screen.queryByText(/recipient_summary|audience|snapshot/i)).toBeNull();
    expect(listMock).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, page_size: 20, student_id: undefined }),
    );
  });

  it('shows empty state', async () => {
    listMock.mockResolvedValue({
      ok: true,
      data: {
        items: [],
        page: 1,
        page_size: 20,
        total: 0,
        total_pages: 1,
        unread_count: 0,
      },
    });
    render(<AnnouncementsRecipientFeed basePath="/student/announcements" />);
    await waitFor(() => {
      expect(screen.getByText('announcements.empty')).toBeTruthy();
    });
  });

  it('loads detail, marks read after success, and downloads attachment safely', async () => {
    const user = userEvent.setup();
    detailMock.mockResolvedValue({
      ok: true,
      data: {
        id: 7,
        content_id: 1,
        school_id: 1,
        subject: 'تفاصيل',
        priority: 'normal',
        is_pinned: false,
        expires_at: '2026-08-01T00:00:00',
        published_at: '2026-07-28T10:00:00',
        sent_date: null,
        is_read: false,
        sender: { id: 2, name: 'الإدارة' },
        body: '<p>محتوى آمن</p>',
        attachments: [
          { id: 3, name: 'note.txt', mimetype: 'text/plain', file_size: 4 },
        ],
      },
    });
    markMock.mockResolvedValue({
      ok: true,
      data: { id: 7, is_read: true, marked_now: true },
    });
    downloadMock.mockResolvedValue({ ok: true });

    render(
      <AnnouncementRecipientDetail
        messageId={7}
        backHref="/student/announcements"
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('تفاصيل')).toBeTruthy();
    });
    expect(screen.getByText('محتوى آمن')).toBeTruthy();
    expect(screen.queryByText('recipient_summary')).toBeNull();

    await waitFor(() => {
      expect(markMock).toHaveBeenCalledWith(7, { student_id: undefined });
    });

    await user.click(screen.getByRole('button', { name: /announcements.downloadAttachment/ }));
    expect(downloadMock).toHaveBeenCalledWith(7, 3, 'note.txt', undefined);
  });

  it('does not treat failed mark-read as success', async () => {
    detailMock.mockResolvedValue({
      ok: true,
      data: {
        id: 8,
        content_id: null,
        school_id: null,
        subject: 'X',
        priority: 'normal',
        is_pinned: false,
        expires_at: null,
        published_at: null,
        sent_date: null,
        is_read: false,
        sender: null,
        body: 'body',
        attachments: [],
      },
    });
    markMock.mockResolvedValue({
      ok: false,
      error: { code: 'forbidden', message: 'no', details: {} },
    });

    render(
      <AnnouncementRecipientDetail messageId={8} backHref="/student/announcements" />,
    );

    await waitFor(() => {
      expect(screen.getByText('announcements.markReadFailed')).toBeTruthy();
    });
    expect(screen.getByText('announcements.unread')).toBeTruthy();
  });
});
