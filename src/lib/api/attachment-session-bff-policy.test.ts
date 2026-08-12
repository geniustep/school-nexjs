import { describe, expect, it } from 'vitest';
import { assertBffRoutePolicy } from './bff-route-policy';

describe('attachment upload-session BFF policy', () => {
  it.each([
    ['POST', '/attachments/upload-sessions'],
    ['POST', '/attachments/upload-sessions/public-id/files'],
    ['POST', '/attachments/upload-sessions/public-id/links'],
    ['DELETE', '/attachments/upload-sessions/public-id/materials/2'],
    ['POST', '/teacher/classes/3/homeworks/upload-sessions/public-id/finalize'],
    ['POST', '/admin/communication/announcements/upload-sessions/public-id/finalize'],
    ['POST', '/channels/3/messages/upload-sessions/public-id/finalize'],
  ])('allows %s %s', (method, path) => {
    expect(assertBffRoutePolicy(path, method)).toEqual({ ok: true });
  });

  it('does not allow unsafe methods or technical namespaces', () => {
    expect(assertBffRoutePolicy('/attachments/upload-sessions', 'PUT').ok).toBe(false);
    expect(assertBffRoutePolicy('/attachments/upload-sessions/x/search_read', 'POST').ok).toBe(false);
  });
});
