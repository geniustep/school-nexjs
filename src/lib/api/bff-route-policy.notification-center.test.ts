import { describe, expect, it } from 'vitest';
import { assertBffRoutePolicy } from './bff-route-policy';

/** The exact School API Notification Center V1 paths, exposed through /api/odoo. */
describe('Notification Center V1 — governed BFF allowlist', () => {
  const allowed: ReadonlyArray<readonly [string, string]> = [
    ['GET', '/notifications'],
    ['GET', '/notifications/unread-count'],
    ['GET', '/notifications/17'],
    ['POST', '/notifications/17/read'],
    ['POST', '/notifications/read-all'],
    ['GET', '/notifications/preferences'],
    ['PATCH', '/notifications/preferences'],
    ['POST', '/notifications/devices/register'],
    ['POST', '/notifications/devices/unregister'],
  ];

  it.each(allowed)('allows %s %s', (method, path) => {
    expect(assertBffRoutePolicy(path, method)).toEqual({ ok: true });
  });

  const denied: ReadonlyArray<readonly [string, string]> = [
    ['POST', '/notifications'],
    ['HEAD', '/notifications'],
    ['DELETE', '/notifications'],
    ['GET', '/notifications/abc'],
    ['GET', '/notifications/0'],
    ['GET', '/notifications/01'],
    ['GET', '/notifications/-1'],
    ['DELETE', '/notifications/17'],
    ['POST', '/notifications/17'],
    ['PATCH', '/notifications/17'],
    ['PATCH', '/notifications/17/read'],
    ['GET', '/notifications/17/read'],
    ['POST', '/notifications/17/delete'],
    ['GET', '/notifications/17/secret'],
    ['PUT', '/notifications/preferences'],
    ['POST', '/notifications/preferences'],
    ['POST', '/notifications/preferences/extra'],
    ['GET', '/notifications/devices/register'],
    ['GET', '/notifications/devices/unregister'],
    ['POST', '/notifications/devices'],
    ['POST', '/notifications/devices/register/other'],
    ['POST', '/notifications/../../admin'],
    ['POST', '/notifications/dataset/call_kw'],
    ['GET', '/notifications/17/like'],
  ];

  it.each(denied)('rejects %s %s', (method, path) => {
    expect(assertBffRoutePolicy(path, method).ok).toBe(false);
  });

  it('keeps the published-announcement and engagement routes available', () => {
    expect(assertBffRoutePolicy('/communication/announcements', 'GET'))
      .toEqual({ ok: true });
    expect(assertBffRoutePolicy('/communication/announcements/17', 'GET'))
      .toEqual({ ok: true });
    expect(assertBffRoutePolicy('/communication/announcements/17/read', 'POST'))
      .toEqual({ ok: true });
    expect(assertBffRoutePolicy('/communication/announcements/17/like', 'DELETE'))
      .toEqual({ ok: true });
    expect(assertBffRoutePolicy('/communication/announcements/17/view', 'POST'))
      .toEqual({ ok: true });
  });
});
