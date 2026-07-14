import { describe, expect, it } from 'vitest';
import {
  applyHasRequestedServicesFilter,
  applyRequestedServiceIdFilter,
  buildAdmissionListServerQuery,
  clearRequestedServicesFilters,
  hasManualContextOrAdvancedFilters,
  parseWorkspaceListStateFromSearchParams,
  workspaceListStateToSearchParams,
  type AdmissionWorkspaceListState,
} from './admission-workspace';

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
    page: 3,
    view: 'table',
    ...patch,
  };
}

describe('admission requested-services list filters', () => {
  it('parses and serializes requested_service_id with mutual exclusion', () => {
    const parsed = parseWorkspaceListStateFromSearchParams(
      new URLSearchParams('requested_service_id=12&has_requested_services=true'),
    );
    expect(parsed.requestedServiceId).toBe('12');
    expect(parsed.hasRequestedServices).toBeUndefined();

    const params = workspaceListStateToSearchParams(
      baseState({ requestedServiceId: '12', hasRequestedServices: 'true', page: 1 }),
    );
    expect(params.get('requested_service_id')).toBe('12');
    expect(params.get('has_requested_services')).toBeNull();
  });

  it('parses has_requested_services when no service id', () => {
    const withServices = parseWorkspaceListStateFromSearchParams(
      new URLSearchParams('has_requested_services=true'),
    );
    expect(withServices.hasRequestedServices).toBe('true');
    expect(withServices.requestedServiceId).toBeUndefined();

    const without = parseWorkspaceListStateFromSearchParams(
      new URLSearchParams('has_requested_services=false'),
    );
    expect(without.hasRequestedServices).toBe('false');
  });

  it('apply helpers reset page and enforce mutual exclusion', () => {
    const byId = applyRequestedServiceIdFilter(
      baseState({ hasRequestedServices: 'true', page: 4 }),
      '7',
    );
    expect(byId).toMatchObject({
      requestedServiceId: '7',
      hasRequestedServices: undefined,
      page: 1,
    });

    const byPresence = applyHasRequestedServicesFilter(
      baseState({ requestedServiceId: '7', page: 2 }),
      'false',
    );
    expect(byPresence).toMatchObject({
      requestedServiceId: undefined,
      hasRequestedServices: 'false',
      page: 1,
    });

    const cleared = clearRequestedServicesFilters(
      baseState({ requestedServiceId: '7', hasRequestedServices: 'true', page: 5 }),
    );
    expect(cleared.requestedServiceId).toBeUndefined();
    expect(cleared.hasRequestedServices).toBeUndefined();
    expect(cleared.page).toBe(1);
  });

  it('builds list query for service id or presence, never both', () => {
    expect(
      buildAdmissionListServerQuery(baseState({ requestedServiceId: '15', page: 1 })),
    ).toMatchObject({ requested_service_id: 15 });

    expect(
      buildAdmissionListServerQuery(
        baseState({ requestedServiceId: '15', hasRequestedServices: 'true', page: 1 }),
      ),
    ).toMatchObject({ requested_service_id: 15 });
    expect(
      buildAdmissionListServerQuery(
        baseState({ requestedServiceId: '15', hasRequestedServices: 'true', page: 1 }),
      ),
    ).not.toHaveProperty('has_requested_services');

    expect(
      buildAdmissionListServerQuery(baseState({ hasRequestedServices: 'true', page: 1 })),
    ).toMatchObject({ has_requested_services: 'true' });
  });

  it('counts service filters as manual filters and chip-clear uses clear helper', () => {
    expect(
      hasManualContextOrAdvancedFilters(baseState({ requestedServiceId: '3' })),
    ).toBe(true);
    expect(
      hasManualContextOrAdvancedFilters(baseState({ hasRequestedServices: 'false' })),
    ).toBe(true);
    expect(hasManualContextOrAdvancedFilters(baseState())).toBe(false);

    const afterChipClear = clearRequestedServicesFilters(
      baseState({ requestedServiceId: '3', page: 2 }),
    );
    expect(afterChipClear.requestedServiceId).toBeUndefined();
    expect(workspaceListStateToSearchParams(afterChipClear).get('requested_service_id')).toBeNull();
  });
});
