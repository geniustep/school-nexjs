import { describe, expect, it } from 'vitest';
import { assertBffRoutePolicy } from '@/lib/api/bff-route-policy';
import { endpoints } from '@/lib/api/endpoints';

describe('announcements recipient BFF contract mapping (5E2)', () => {
  it('maps Odoo endpoints to Next.js endpoint registry', () => {
    expect(endpoints.communication.announcements).toBe('/communication/announcements');
    expect(endpoints.communication.announcement(12)).toBe('/communication/announcements/12');
    expect(endpoints.communication.announcementRead(12)).toBe(
      '/communication/announcements/12/read',
    );
    expect(endpoints.communication.announcementAttachmentDownload(12, 9)).toBe(
      '/communication/announcements/12/attachments/9/download',
    );
  });

  it('allows list/detail GET and mark-read POST', () => {
    expect(assertBffRoutePolicy('/communication/announcements', 'GET').ok).toBe(true);
    expect(assertBffRoutePolicy('/communication/announcements/12', 'GET').ok).toBe(true);
    expect(assertBffRoutePolicy('/communication/announcements/12/read', 'POST').ok).toBe(true);
    expect(
      assertBffRoutePolicy(
        '/communication/announcements/12/attachments/9/download',
        'GET',
      ).ok,
    ).toBe(true);
  });

  it('rejects wrong methods and invented paths', () => {
    expect(assertBffRoutePolicy('/communication/announcements', 'POST').ok).toBe(false);
    expect(assertBffRoutePolicy('/communication/announcements/12/read', 'GET').ok).toBe(false);
    expect(assertBffRoutePolicy('/communication/announcements/12/delete', 'POST').ok).toBe(
      false,
    );
    expect(assertBffRoutePolicy('/communication/audience', 'GET').ok).toBe(false);
    expect(assertBffRoutePolicy('/communication/announcements/12/approve', 'POST').ok).toBe(
      false,
    );
  });

  it('does not invent school_id expansion routes', () => {
    expect(assertBffRoutePolicy('/communication/announcements/by-school/1', 'GET').ok).toBe(
      false,
    );
  });
});
