import { describe, expect, it } from 'vitest';
import { assertBffRoutePolicy, shouldBindActiveSchoolInBody } from './bff-route-policy';

describe('physical library BFF policy', () => {
  it.each([
    ['GET', '/admin/library/titles'],
    ['POST', '/admin/library/titles'],
    ['PATCH', '/admin/library/titles/7'],
    ['POST', '/admin/library/titles/7/archive'],
    ['GET', '/admin/library/copies'],
    ['POST', '/admin/library/copies'],
    ['POST', '/admin/library/copies/12/checkout'],
    ['POST', '/admin/library/copies/12/mark-lost'],
    ['POST', '/admin/library/copies/12/mark-damaged'],
    ['POST', '/admin/library/copies/12/send-to-repair'],
    ['POST', '/admin/library/copies/12/restore'],
    ['POST', '/admin/library/copies/12/withdraw'],
    ['GET', '/admin/library/circulations'],
    ['POST', '/admin/library/circulations/44/return'],
  ])('allows %s %s', (method, path) => {
    expect(assertBffRoutePolicy(path, method)).toEqual({ ok: true });
  });

  it.each([
    ['/admin/library/titles', 'POST'],
    ['/admin/library/titles/7', 'PATCH'],
    ['/admin/library/copies', 'POST'],
    ['/admin/library/copies/12/checkout', 'POST'],
    ['/admin/library/copies/12/restore', 'POST'],
    ['/admin/library/circulations/44/return', 'POST'],
  ])('binds %s %s to the trusted active school', (path, method) => {
    expect(shouldBindActiveSchoolInBody(path, method)).toBe(true);
  });
});
