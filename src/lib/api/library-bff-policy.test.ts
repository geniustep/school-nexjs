import { describe, expect, it } from 'vitest';
import { assertBffRoutePolicy, shouldBindActiveSchoolInBody } from './bff-route-policy';

describe('physical library BFF policy', () => {
  it.each([
    ['GET', '/admin/library/titles'],
    ['POST', '/admin/library/titles'],
    ['GET', '/admin/library/copies'],
    ['POST', '/admin/library/copies/12/checkout'],
    ['GET', '/admin/library/circulations'],
    ['POST', '/admin/library/circulations/44/return'],
  ])('allows %s %s', (method, path) => {
    expect(assertBffRoutePolicy(path, method)).toEqual({ ok: true });
  });

  it('binds library writes to the trusted active school', () => {
    expect(shouldBindActiveSchoolInBody('/admin/library/titles', 'POST')).toBe(true);
    expect(shouldBindActiveSchoolInBody('/admin/library/copies/12/checkout', 'POST')).toBe(true);
  });
});
