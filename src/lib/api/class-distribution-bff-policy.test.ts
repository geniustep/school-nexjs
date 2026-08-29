import { describe, expect, it } from 'vitest';
import { assertBffRoutePolicy, shouldBindActiveSchoolInBody } from '@/lib/api/bff-route-policy';

describe('class distribution BFF policy', () => {
  it('preserves the governed V1 read contract', () => {
    expect(assertBffRoutePolicy('/admin/class-distribution', 'GET')).toEqual({ ok: true });
    expect(assertBffRoutePolicy('/admin/class-distribution', 'HEAD')).toEqual({ ok: true });
  });

  it('preserves only POST for the V1 assignment mutation', () => {
    expect(assertBffRoutePolicy('/admin/class-distribution/assign', 'POST')).toEqual({ ok: true });
    expect(assertBffRoutePolicy('/admin/class-distribution/assign', 'DELETE')).toEqual({
      ok: false,
      reason: 'method_not_allowed',
    });
  });

  it('allows only GET/HEAD for the Workspace V2 read contract', () => {
    expect(assertBffRoutePolicy('/admin/class-distribution/workspace', 'GET')).toEqual({ ok: true });
    expect(assertBffRoutePolicy('/admin/class-distribution/workspace', 'HEAD')).toEqual({ ok: true });
    expect(assertBffRoutePolicy('/admin/class-distribution/workspace', 'POST')).toEqual({
      ok: false,
      reason: 'method_not_allowed',
    });
  });

  it('allows only POST for the Workspace V2 move contract', () => {
    expect(assertBffRoutePolicy('/admin/class-distribution/move', 'POST')).toEqual({ ok: true });
    expect(assertBffRoutePolicy('/admin/class-distribution/move', 'GET')).toEqual({
      ok: false,
      reason: 'method_not_allowed',
    });
    expect(assertBffRoutePolicy('/admin/class-distribution/move/extra', 'POST')).toEqual({
      ok: false,
      reason: 'path_not_allowed',
    });
  });

  it('keeps active school on trusted admin query/session rather than distribution mutation body', () => {
    expect(shouldBindActiveSchoolInBody('/admin/class-distribution/assign', 'POST')).toBe(false);
    expect(shouldBindActiveSchoolInBody('/admin/class-distribution/move', 'POST')).toBe(false);
  });
});
