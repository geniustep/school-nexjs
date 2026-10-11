import { describe, expect, it } from 'vitest';
import { assertBffRoutePolicy } from './bff-route-policy';

describe('Admin user activity BFF route policy', () => {
  it('allows only GET and HEAD on the exact route', () => {
    expect(assertBffRoutePolicy('/admin/user-activity', 'GET')).toEqual({ ok: true });
    expect(assertBffRoutePolicy('/admin/user-activity', 'HEAD')).toEqual({ ok: true });
  });

  it('rejects mutations and nested paths', () => {
    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
      expect(assertBffRoutePolicy('/admin/user-activity', method)).toEqual({
        ok: false,
        reason: 'method_not_allowed',
      });
    }
    expect(assertBffRoutePolicy('/admin/user-activity/export', 'GET')).toEqual({
      ok: false,
      reason: 'path_not_allowed',
    });
  });
});
