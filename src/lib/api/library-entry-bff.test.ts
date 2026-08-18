import { describe, expect, it } from 'vitest';
import { assertBffRoutePolicy } from './bff-route-policy';

describe('library and entry requirement BFF policy', () => {
  it('allows governed admin entry requirement routes', () => {
    expect(assertBffRoutePolicy('/admin/entry-requirement-lists', 'GET')).toEqual({ ok: true });
    expect(assertBffRoutePolicy('/admin/entry-requirement-lists/12/publish', 'POST')).toEqual({ ok: true });
  });

  it('allows teacher and parent entry requirement self-service routes', () => {
    expect(assertBffRoutePolicy('/teacher/entry-requirements', 'GET')).toEqual({ ok: true });
    expect(assertBffRoutePolicy('/parent/entry-requirements', 'GET')).toEqual({ ok: true });
    expect(assertBffRoutePolicy('/parent/children/7/entry-requirements/progress', 'PATCH')).toEqual({ ok: true });
  });

  it('allows student library self-service without opening a generic staff family', () => {
    expect(assertBffRoutePolicy('/student/library/titles', 'GET')).toEqual({ ok: true });
    expect(assertBffRoutePolicy('/student/library/requests', 'POST')).toEqual({ ok: true });
    expect(assertBffRoutePolicy('/staff/library/titles', 'GET').ok).toBe(false);
  });
});
