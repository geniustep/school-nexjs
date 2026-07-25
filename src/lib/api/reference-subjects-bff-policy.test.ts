import { describe, expect, it } from 'vitest';
import {
  assertBffRoutePolicy,
  hasDeniedBffNamespace,
  shouldBindActiveSchoolInBody,
} from '@/lib/api/bff-route-policy';
import { endpoints } from '@/lib/api/endpoints';

describe('BFF reference-subjects exact POST policy', () => {
  const path = endpoints.admin.referenceSubjects;

  it('allows POST on the exact path only', () => {
    expect(assertBffRoutePolicy(path, 'POST')).toEqual({ ok: true });
  });

  it('rejects other methods on the exact path as method_not_allowed', () => {
    expect(assertBffRoutePolicy(path, 'GET')).toEqual({
      ok: false,
      reason: 'method_not_allowed',
    });
    expect(assertBffRoutePolicy(path, 'PUT')).toEqual({
      ok: false,
      reason: 'method_not_allowed',
    });
    expect(assertBffRoutePolicy(path, 'PATCH')).toEqual({
      ok: false,
      reason: 'method_not_allowed',
    });
    expect(assertBffRoutePolicy(path, 'DELETE')).toEqual({
      ok: false,
      reason: 'method_not_allowed',
    });
  });

  it('rejects nested paths as path_not_allowed', () => {
    expect(assertBffRoutePolicy('/admin/reference-subjects/12', 'POST')).toEqual({
      ok: false,
      reason: 'path_not_allowed',
    });
    expect(assertBffRoutePolicy('/admin/reference-subjects/12', 'GET')).toEqual({
      ok: false,
      reason: 'path_not_allowed',
    });
  });

  it('does not bind active_school_id into the mutation body', () => {
    expect(shouldBindActiveSchoolInBody(path, 'POST')).toBe(false);
  });

  it('keeps technical namespaces denied', () => {
    expect(hasDeniedBffNamespace('/admin/reference-subjects/search_read')).toBe(true);
    expect(assertBffRoutePolicy('/admin/reference-subjects/search_read', 'POST').ok).toBe(false);
    expect(assertBffRoutePolicy('/web/dataset', 'GET').ok).toBe(false);
  });
});
