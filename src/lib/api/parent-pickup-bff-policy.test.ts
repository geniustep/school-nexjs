import { describe, expect, it } from 'vitest';
import {
  assertBffRoutePolicy,
  shouldBindActiveSchoolInBody,
  shouldInjectActiveSchoolIdInBody,
} from './bff-route-policy';

const PATH = '/parent/pickup/session';

describe('BFF parent pickup session route policy', () => {
  it('allows only exact POST /parent/pickup/session', () => {
    expect(assertBffRoutePolicy(PATH, 'POST')).toEqual({ ok: true });
    expect(assertBffRoutePolicy(PATH, 'GET')).toEqual({
      ok: false,
      reason: 'method_not_allowed',
    });
    expect(assertBffRoutePolicy(PATH, 'PUT')).toEqual({
      ok: false,
      reason: 'method_not_allowed',
    });
    expect(assertBffRoutePolicy(PATH, 'PATCH')).toEqual({
      ok: false,
      reason: 'method_not_allowed',
    });
    expect(assertBffRoutePolicy(PATH, 'DELETE')).toEqual({
      ok: false,
      reason: 'method_not_allowed',
    });
    expect(assertBffRoutePolicy(PATH, 'HEAD')).toEqual({
      ok: false,
      reason: 'method_not_allowed',
    });
  });

  it('denies nested pickup routes', () => {
    expect(assertBffRoutePolicy('/parent/pickup/session/extra', 'POST')).toEqual({
      ok: false,
      reason: 'path_not_allowed',
    });
    expect(assertBffRoutePolicy('/parent/pickup/refresh', 'POST')).toEqual({
      ok: false,
      reason: 'path_not_allowed',
    });
  });

  it('does not affect existing parent families', () => {
    expect(assertBffRoutePolicy('/parent/children', 'GET')).toEqual({ ok: true });
    expect(assertBffRoutePolicy('/parent/finance/summary', 'GET')).toEqual({ ok: true });
    expect(assertBffRoutePolicy('/parent/admin-requests', 'POST')).toEqual({ ok: true });
  });

  it('does not bind active school into pickup session body', () => {
    expect(shouldBindActiveSchoolInBody(PATH, 'POST')).toBe(false);
    expect(shouldInjectActiveSchoolIdInBody(PATH)).toBe(true);
  });
});
