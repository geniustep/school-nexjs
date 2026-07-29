import { describe, expect, it } from 'vitest';
import {
  normalizeAnnouncementDelivery,
  normalizeAnnouncementList,
  normalizeMarkReadResult,
  readUnreadCount,
} from './normalize-announcement';

describe('normalizeAnnouncementDelivery', () => {
  it('parses list row fields null-safely', () => {
    const item = normalizeAnnouncementDelivery({
      id: '41',
      content_id: 7,
      school_id: null,
      subject: '  اجتماع  ',
      priority: 'important',
      is_pinned: 1,
      expires_at: null,
      published_at: '2026-07-28T10:00:00',
      sent_date: null,
      is_read: false,
      sender: { id: 3, name: 'إدارة' },
      body: '<p>should not appear on list</p>',
      attachments: [{ id: 1, name: 'a.txt' }],
      recipient_summary: { total: 99 },
    });
    expect(item).toEqual({
      id: 41,
      content_id: 7,
      school_id: null,
      subject: 'اجتماع',
      priority: 'important',
      is_pinned: true,
      expires_at: null,
      published_at: '2026-07-28T10:00:00',
      sent_date: null,
      is_read: false,
      sender: { id: 3, name: 'إدارة' },
    });
    expect(item).not.toHaveProperty('body');
    expect(item).not.toHaveProperty('attachments');
    expect(item).not.toHaveProperty('recipient_summary');
  });

  it('includes body and attachments on detail only', () => {
    const item = normalizeAnnouncementDelivery(
      {
        id: 2,
        subject: 'x',
        priority: 'urgent',
        is_pinned: false,
        is_read: true,
        sender: { id: 1, name: 'A' },
        body: '<p>Hello</p>',
        attachments: [
          { id: 9, name: 'f.txt', mimetype: 'text/plain', file_size: 12 },
          { id: 0, name: 'bad' },
        ],
      },
      { detail: true },
    );
    expect(item?.body).toBe('<p>Hello</p>');
    expect(item?.attachments).toEqual([
      { id: 9, name: 'f.txt', mimetype: 'text/plain', file_size: 12 },
    ]);
    expect(item?.priority).toBe('urgent');
  });

  it('rejects invalid ids', () => {
    expect(normalizeAnnouncementDelivery({ id: 0 })).toBeNull();
    expect(normalizeAnnouncementDelivery(null)).toBeNull();
  });
});

describe('normalizeAnnouncementList', () => {
  it('deduplicates by id without inventing rows', () => {
    const items = normalizeAnnouncementList([
      { id: 1, subject: 'a', is_read: false, is_pinned: false, priority: 'normal' },
      { id: 1, subject: 'dup', is_read: true, is_pinned: false, priority: 'normal' },
      { id: -1, subject: 'bad' },
      'x',
    ]);
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe(1);
    expect(items[0].subject).toBe('a');
  });
});

describe('normalizeMarkReadResult / unread_count', () => {
  it('parses mark-read result', () => {
    expect(normalizeMarkReadResult({ id: 5, is_read: true, marked_now: false })).toEqual({
      id: 5,
      is_read: true,
      marked_now: false,
    });
  });

  it('reads unread_count safely', () => {
    expect(readUnreadCount({ unread_count: 3 })).toBe(3);
    expect(readUnreadCount({ unread_count: -2 })).toBe(0);
    expect(readUnreadCount(null)).toBe(0);
  });
});
