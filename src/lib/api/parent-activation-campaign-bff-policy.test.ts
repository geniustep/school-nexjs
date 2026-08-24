import { describe, expect, it } from 'vitest';
import { assertBffRoutePolicy, shouldBindActiveSchoolInBody, shouldInjectActiveSchoolIdInBody } from './bff-route-policy';
import { endpoints } from './endpoints';

describe('parent activation campaign BFF policy', () => {
  it('allows the prepared campaign read and preview preparation only', () => {
    expect(assertBffRoutePolicy(endpoints.admin.parentActivationCampaignPrepare, 'POST')).toEqual({ ok: true });
    expect(assertBffRoutePolicy(endpoints.admin.parentActivationCampaign(17), 'GET')).toEqual({ ok: true });
  });

  it('keeps school scope trusted without adding it to the strict Odoo body', () => {
    const path = endpoints.admin.parentActivationCampaignPrepare;
    expect(shouldBindActiveSchoolInBody(path, 'POST')).toBe(true);
    expect(shouldInjectActiveSchoolIdInBody(path)).toBe(false);
  });
});
