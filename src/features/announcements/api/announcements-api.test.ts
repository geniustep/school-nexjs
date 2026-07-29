/** @vitest-environment happy-dom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { endpoints } from '@/lib/api/endpoints';

const getMock = vi.fn();
const postMock = vi.fn();

vi.mock('@/lib/api/client', () => ({
  api: {
    get: (...args: unknown[]) => getMock(...args),
    post: (...args: unknown[]) => postMock(...args),
  },
}));

vi.mock('@/lib/auth/active-role-client', () => ({
  clientActiveRoleHeaders: () => ({ 'X-SSC-Active-Role': 'parent' }),
}));

import {
  downloadAnnouncementAttachment,
  fetchAnnouncementDetail,
  fetchAnnouncementList,
  markAnnouncementRead,
} from './announcements-api';

describe('announcements-api', () => {
  beforeEach(() => {
    getMock.mockReset();
    postMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('lists with pagination query and folds unread_count', async () => {
    getMock.mockResolvedValue({
      success: true,
      data: [
        {
          id: 10,
          subject: 'A',
          priority: 'normal',
          is_pinned: true,
          is_read: false,
          published_at: '2026-07-01T00:00:00',
          sender: { id: 1, name: 'Admin' },
        },
      ],
      meta: {
        pagination: { page: 2, page_size: 20, total: 21, total_pages: 2 },
        unread_count: 4,
      },
    });

    const res = await fetchAnnouncementList({ page: 2, page_size: 20, student_id: 55 });
    expect(getMock).toHaveBeenCalledWith(endpoints.communication.announcements, {
      page: 2,
      page_size: 20,
      student_id: 55,
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.items).toHaveLength(1);
    expect(res.data.unread_count).toBe(4);
    expect(res.data.page).toBe(2);
    expect(res.data.total).toBe(21);
    expect(res.data.items[0].is_pinned).toBe(true);
  });

  it('loads detail and mark-read paths', async () => {
    getMock.mockResolvedValue({
      success: true,
      data: {
        id: 10,
        subject: 'A',
        priority: 'important',
        is_pinned: false,
        is_read: false,
        body: '<p>x</p>',
        attachments: [{ id: 3, name: 'a.txt', mimetype: 'text/plain', file_size: 1 }],
        sender: { id: 1, name: 'Admin' },
      },
      meta: {},
    });
    postMock.mockResolvedValue({
      success: true,
      data: { id: 10, is_read: true, marked_now: true },
      meta: {},
    });

    const detail = await fetchAnnouncementDetail(10, { student_id: 55 });
    expect(getMock).toHaveBeenCalledWith(endpoints.communication.announcement(10), {
      page: undefined,
      page_size: undefined,
      student_id: 55,
    });
    expect(detail.ok).toBe(true);

    const mark = await markAnnouncementRead(10, { student_id: 55 });
    expect(postMock).toHaveBeenCalledWith(
      endpoints.communication.announcementRead(10),
      {},
      { page: undefined, page_size: undefined, student_id: 55 },
    );
    expect(mark.ok).toBe(true);
    if (mark.ok) expect(mark.data.marked_now).toBe(true);
  });

  it('downloads attachments through BFF with active role and no-store', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      blob: async () => new Blob(['x']),
    });
    vi.stubGlobal('fetch', fetchMock);
    const createObjectURL = vi.fn(() => 'blob:mock');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
    const click = vi.fn();
    const appendChild = vi.spyOn(document.body, 'appendChild').mockImplementation((n) => n);
    const remove = vi.fn();
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'a') {
        return {
          href: '',
          download: '',
          rel: '',
          click,
          remove,
          style: {},
        } as unknown as HTMLAnchorElement;
      }
      return document.createElementNS('http://www.w3.org/1999/xhtml', tag) as HTMLElement;
    });

    const result = await downloadAnnouncementAttachment(10, 3, 'a.txt', 55);
    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/odoo/communication/announcements/10/attachments/3/download?student_id=55',
      expect.objectContaining({
        method: 'GET',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: expect.objectContaining({ 'X-SSC-Active-Role': 'parent' }),
      }),
    );
    expect(click).toHaveBeenCalled();
    appendChild.mockRestore();
  });

  it('maps attachment 404 without leaking internal URLs', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 404 });
    vi.stubGlobal('fetch', fetchMock);
    const result = await downloadAnnouncementAttachment(10, 99, 'x.bin');
    expect(result).toEqual({
      ok: false,
      status: 404,
      messageKey: 'errors.attachmentNotFound',
    });
  });
});
