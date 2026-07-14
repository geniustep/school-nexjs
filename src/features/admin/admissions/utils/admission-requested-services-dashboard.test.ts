import { describe, expect, it } from 'vitest';
import {
  applyHasRequestedServicesFilter,
  applyRequestedServiceIdFilter,
  buildAdmissionListServerQuery,
  clearRequestedServicesFilters,
  type AdmissionWorkspaceListState,
} from './admission-workspace';
import { normalizeRequestedServiceCounts } from './admission-requested-services';

function baseState(
  patch: Partial<AdmissionWorkspaceListState> = {},
): AdmissionWorkspaceListState {
  return {
    workspace: 'follow_up',
    followStage: '',
    awaitingSub: '',
    postSub: 'awaiting',
    closedSub: 'rejected',
    hideConverted: true,
    page: 1,
    view: 'table',
    ...patch,
  };
}

describe('admission requested-services dashboard parity', () => {
  const dashboardFixture = {
    requested_service_counts: [
      { service_id: 21, name: 'Service Twenty-One', count: 8, code: 's21' },
      { service_id: 22, name: 'Service Twenty-Two', count: 3 },
    ],
    any_requested_services_count: 11,
    no_requested_services_count: 4,
  };

  it('normalizes count fixtures without inventing zeros for missing data', () => {
    const counts = normalizeRequestedServiceCounts(dashboardFixture.requested_service_counts);
    expect(counts).toEqual([
      { service_id: 21, code: 's21', name: 'Service Twenty-One', count: 8 },
      { service_id: 22, code: null, name: 'Service Twenty-Two', count: 3 },
    ]);
    expect(normalizeRequestedServiceCounts(null)).toEqual([]);
    expect(normalizeRequestedServiceCounts(undefined)).toEqual([]);
  });

  it('card click helpers produce the same list query keys as URL filters', () => {
    const serviceState = applyRequestedServiceIdFilter(baseState(), '21');
    expect(buildAdmissionListServerQuery(serviceState)).toMatchObject({
      requested_service_id: 21,
    });
    expect(buildAdmissionListServerQuery(serviceState)).not.toHaveProperty(
      'has_requested_services',
    );

    const anyState = applyHasRequestedServicesFilter(baseState(), 'true');
    expect(buildAdmissionListServerQuery(anyState)).toMatchObject({
      has_requested_services: 'true',
    });

    const noneState = applyHasRequestedServicesFilter(baseState({ requestedServiceId: '21' }), 'false');
    expect(noneState.requestedServiceId).toBeUndefined();
    expect(buildAdmissionListServerQuery(noneState)).toMatchObject({
      has_requested_services: 'false',
    });

    const cleared = clearRequestedServicesFilters(serviceState);
    expect(buildAdmissionListServerQuery(cleared)).not.toHaveProperty('requested_service_id');
    expect(buildAdmissionListServerQuery(cleared)).not.toHaveProperty('has_requested_services');
  });
});
