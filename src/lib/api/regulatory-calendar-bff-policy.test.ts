import { describe, expect, it } from 'vitest';
import { assertBffRoutePolicy, shouldBindActiveSchoolInBody } from './bff-route-policy';

describe('regulatory calendar BFF policy', () => {
  it('allows only GET/HEAD for overview', () => {
    expect(assertBffRoutePolicy('/admin/regulatory-calendar/overview', 'GET')).toEqual({ ok: true });
    expect(assertBffRoutePolicy('/admin/regulatory-calendar/overview', 'HEAD')).toEqual({ ok: true });
    expect(assertBffRoutePolicy('/admin/regulatory-calendar/overview', 'POST')).toEqual({
      ok: false,
      reason: 'method_not_allowed',
    });
  });

  it('allows only POST for project', () => {
    expect(assertBffRoutePolicy('/admin/regulatory-calendar/project', 'POST')).toEqual({ ok: true });
    expect(assertBffRoutePolicy('/admin/regulatory-calendar/project', 'GET')).toEqual({
      ok: false,
      reason: 'method_not_allowed',
    });
    expect(assertBffRoutePolicy('/admin/regulatory-calendar/project', 'DELETE')).toEqual({
      ok: false,
      reason: 'method_not_allowed',
    });
  });

  it('does not inject active_school_id into the strict project body', () => {
    expect(shouldBindActiveSchoolInBody('/admin/regulatory-calendar/project', 'POST')).toBe(false);
  });
});
