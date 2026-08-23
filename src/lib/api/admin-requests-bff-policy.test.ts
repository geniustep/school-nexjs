import { describe, expect, it } from 'vitest';
import { assertBffRoutePolicy, shouldBindActiveSchoolInBody } from './bff-route-policy';
import { endpoints } from './endpoints';

describe('admin requests BFF policy', () => {
  it('allows parent request list, types, create, detail and actions', () => {
    expect(assertBffRoutePolicy(endpoints.parent.adminRequests, 'GET')).toEqual({ ok: true });
    expect(assertBffRoutePolicy(endpoints.parent.adminRequestTypes, 'GET')).toEqual({ ok: true });
    expect(assertBffRoutePolicy(endpoints.parent.adminRequests, 'POST')).toEqual({ ok: true });
    expect(assertBffRoutePolicy(endpoints.parent.adminRequest(17), 'GET')).toEqual({ ok: true });
    expect(assertBffRoutePolicy(endpoints.parent.adminRequestSubmit(17), 'POST')).toEqual({ ok: true });
    expect(assertBffRoutePolicy(endpoints.parent.adminRequestCancel(17), 'POST')).toEqual({ ok: true });
    expect(assertBffRoutePolicy(endpoints.parent.adminRequestReply(17), 'POST')).toEqual({ ok: true });
  });

  it('allows student request list, types, create, detail and actions', () => {
    expect(assertBffRoutePolicy(endpoints.student.adminRequests, 'GET')).toEqual({ ok: true });
    expect(assertBffRoutePolicy(endpoints.student.adminRequestTypes, 'GET')).toEqual({ ok: true });
    expect(assertBffRoutePolicy(endpoints.student.adminRequests, 'POST')).toEqual({ ok: true });
    expect(assertBffRoutePolicy(endpoints.student.adminRequest(17), 'GET')).toEqual({ ok: true });
    expect(assertBffRoutePolicy(endpoints.student.adminRequestSubmit(17), 'POST')).toEqual({ ok: true });
    expect(assertBffRoutePolicy(endpoints.student.adminRequestCancel(17), 'POST')).toEqual({ ok: true });
    expect(assertBffRoutePolicy(endpoints.student.adminRequestReply(17), 'POST')).toEqual({ ok: true });
  });

  it('allows admin list, detail and workflow actions', () => {
    expect(assertBffRoutePolicy(endpoints.admin.adminRequests, 'GET')).toEqual({ ok: true });
    expect(assertBffRoutePolicy(endpoints.admin.adminRequest(17), 'GET')).toEqual({ ok: true });
    expect(assertBffRoutePolicy(endpoints.admin.adminRequestAction(17, 'start-review'), 'POST')).toEqual({ ok: true });
  });

  it('keeps admin request mutation bodies free from active-school injection', () => {
    expect(shouldBindActiveSchoolInBody(endpoints.admin.adminRequestAction(17, 'start-review'), 'POST')).toBe(false);
  });
});
