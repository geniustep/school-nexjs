import { describe, expect, it } from 'vitest';
import { assertBffRoutePolicy } from '@/lib/api/bff-route-policy';
import { endpoints } from '@/lib/api/endpoints';

/**
 * B4 regression — recipient announcements must not alter authoring preview/submit paths.
 */
describe('communication B4 regression with announcements (5E2)', () => {
  it('keeps B4 recipient-preview allowlist intact', () => {
    expect(
      assertBffRoutePolicy('/channels/1/messages/recipient-preview', 'POST').ok,
    ).toBe(true);
    expect(
      assertBffRoutePolicy('/admin/channels/10/messages/recipient-preview', 'POST').ok,
    ).toBe(true);
    expect(
      assertBffRoutePolicy('/admin/communication/content/34/recipient-preview', 'POST').ok,
    ).toBe(true);
    expect(
      assertBffRoutePolicy('/staff/communication/content/34/recipient-preview', 'POST').ok,
    ).toBe(true);
  });

  it('keeps admin review content paths separate from recipient announcements', () => {
    expect(assertBffRoutePolicy('/admin/communication/content', 'GET').ok).toBe(true);
    expect(assertBffRoutePolicy('/admin/communication/content/34/approve', 'POST').ok).toBe(
      true,
    );
    expect(endpoints.admin.communicationContent).toBe('/admin/communication/content');
    expect(endpoints.communication.announcements).toBe('/communication/announcements');
    expect(endpoints.communication.announcements).not.toMatch(/^\/admin\//);
  });

  it('keeps my-pending-messages path available', () => {
    expect(assertBffRoutePolicy('/channels/1/my-pending-messages', 'GET').ok).toBe(true);
    expect(endpoints.channels.myPendingMessages(1)).toBe('/channels/1/my-pending-messages');
  });
});
