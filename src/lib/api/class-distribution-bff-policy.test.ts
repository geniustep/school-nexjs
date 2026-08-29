import { describe, expect, it } from 'vitest';
import { assertBffRoutePolicy, shouldBindActiveSchoolInBody } from '@/lib/api/bff-route-policy';

describe('class distribution BFF policy', () => {
  it('allows the governed read contract', () => {
    expect(assertBffRoutePolicy('/admin/class-distribution', 'GET')).toEqual({ ok: true });
  });

  it('allows only POST for the assignment mutation', () => {
    expect(assertBffRoutePolicy('/admin/class-distribution/assign', 'POST')).toEqual({ ok: true });
    expect(assertBffRoutePolicy('/admin/class-distribution/assign', 'DELETE')).toEqual({
      ok: false,
      reason: 'method_not_allowed',
    });
  });

  it('keeps active school on trusted admin query/session rather than mutation body', () => {
    expect(shouldBindActiveSchoolInBody('/admin/class-distribution/assign', 'POST')).toBe(false);
  });
});
