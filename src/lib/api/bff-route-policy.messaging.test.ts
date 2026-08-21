import { describe, expect, it } from 'vitest';
import { assertBffRoutePolicy, shouldBindActiveSchoolInBody } from './bff-route-policy';

const PATH = '/admin/integrations/raqeem/messaging/account-created';

describe('BFF Raqeem Messaging route policy', () => {
  it('allows only the exact account-created POST route', () => {
    expect(assertBffRoutePolicy(PATH, 'POST')).toEqual({ ok: true });
    expect(assertBffRoutePolicy(PATH, 'GET')).toEqual({
      ok: false,
      reason: 'method_not_allowed',
    });
    expect(
      assertBffRoutePolicy('/admin/integrations/raqeem/messaging/anything-else', 'POST'),
    ).toEqual({ ok: false, reason: 'path_not_allowed' });
  });

  it('does not bind active_school_id into the strict JSON body', () => {
    expect(shouldBindActiveSchoolInBody(PATH, 'POST')).toBe(false);
  });
});
