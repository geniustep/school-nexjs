import { describe, expect, it } from 'vitest';
import { assertBffRoutePolicy } from './bff-route-policy';

describe('BFF announcement engagement allowlist', () => {
  const like = '/communication/announcements/123/like';
  const view = '/communication/announcements/123/view';

  it('allows POST and DELETE for a single announcement like', () => {
    expect(assertBffRoutePolicy(like, 'POST')).toEqual({ ok: true });
    expect(assertBffRoutePolicy(like, 'DELETE')).toEqual({ ok: true });
  });

  it('allows POST for a single announcement view', () => {
    expect(assertBffRoutePolicy(view, 'POST')).toEqual({ ok: true });
  });

  it.each([
    [like, 'GET'],
    [like, 'PUT'],
    [like, 'PATCH'],
    [view, 'GET'],
    [view, 'DELETE'],
    [view, 'PATCH'],
    ['/communication/announcements/123/like/other', 'POST'],
    ['/communication/announcements/123/view/other', 'POST'],
    ['/communication/announcements/123/comments', 'POST'],
    ['/communication/announcements/123/delete', 'DELETE'],
  ])('does not grant extra access to %s via %s', (path, method) => {
    expect(assertBffRoutePolicy(path, method).ok).toBe(false);
  });

  it('preserves the existing read and attachment routes', () => {
    expect(assertBffRoutePolicy('/communication/announcements', 'GET')).toEqual({ ok: true });
    expect(assertBffRoutePolicy('/communication/announcements/123', 'GET')).toEqual({ ok: true });
    expect(assertBffRoutePolicy('/communication/announcements/123/read', 'POST')).toEqual({ ok: true });
    expect(assertBffRoutePolicy('/communication/announcements/123/attachments/4/preview', 'GET')).toEqual({ ok: true });
  });
});
