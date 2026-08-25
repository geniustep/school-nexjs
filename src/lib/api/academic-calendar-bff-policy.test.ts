import { describe, expect, it } from 'vitest';
import { assertBffRoutePolicy, shouldBindActiveSchoolInBody } from './bff-route-policy';

describe('academic calendar BFF policy', () => {
  it('allows academic calendar list and detail reads', () => {
    expect(assertBffRoutePolicy('/admin/academic-calendars', 'GET')).toEqual({ ok: true });
    expect(assertBffRoutePolicy('/admin/academic-calendars/106', 'GET')).toEqual({ ok: true });
    expect(assertBffRoutePolicy('/admin/academic-calendars/106', 'HEAD')).toEqual({ ok: true });
  });

  it('allows the existing academic calendar lifecycle routes', () => {
    expect(assertBffRoutePolicy('/admin/academic-calendars/106/events', 'POST')).toEqual({ ok: true });
    expect(assertBffRoutePolicy('/admin/academic-calendars/106/publish', 'POST')).toEqual({ ok: true });
    expect(assertBffRoutePolicy('/admin/academic-calendars/106/events/7', 'DELETE')).toEqual({ ok: true });
  });

  it('keeps academic calendar mutation bodies unbound; school scope stays in query/session', () => {
    expect(shouldBindActiveSchoolInBody('/admin/academic-calendars/106/publish', 'POST')).toBe(false);
  });
});
