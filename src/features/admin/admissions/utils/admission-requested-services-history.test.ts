import { describe, expect, it } from 'vitest';
import {
  applyHasRequestedServicesFilter,
  applyRequestedServiceIdFilter,
  clearRequestedServicesFilters,
  parseWorkspaceListStateFromSearchParams,
  workspaceListStateToSearchParams,
  type AdmissionWorkspaceListState,
} from './admission-workspace';
import { resolveAdmissionsListUrlNavigationMode } from './admission-url-navigation';

function base(patch: Partial<AdmissionWorkspaceListState> = {}): AdmissionWorkspaceListState {
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

describe('requested-services History navigation sequence', () => {
  it('card transport then canteen produces two distinct push URLs; back restores transport', () => {
    const start = base({ search: 'سلمى' });
    const startQs = workspaceListStateToSearchParams(start).toString();

    const transport = applyRequestedServiceIdFilter(start, '9101');
    const transportQs = workspaceListStateToSearchParams(transport).toString();
    expect(
      resolveAdmissionsListUrlNavigationMode({
        trigger: 'user_service_card',
        nextQs: transportQs,
        currentQs: startQs,
      }),
    ).toBe('push');
    expect(transport.page).toBe(1);
    expect(transport.search).toBe('سلمى');
    expect(transport.hasRequestedServices).toBeUndefined();

    const canteen = applyRequestedServiceIdFilter(transport, '9102');
    const canteenQs = workspaceListStateToSearchParams(canteen).toString();
    expect(
      resolveAdmissionsListUrlNavigationMode({
        trigger: 'user_service_card',
        nextQs: canteenQs,
        currentQs: transportQs,
      }),
    ).toBe('push');
    expect(canteen.requestedServiceId).toBe('9102');

    // Simulated browser Back restores the previous push target.
    const restored = parseWorkspaceListStateFromSearchParams(new URLSearchParams(transportQs));
    expect(restored.requestedServiceId).toBe('9101');
    expect(restored.hasRequestedServices).toBeUndefined();
    expect(restored.search).toBe('سلمى');
  });

  it('any / none / chip clear use push and keep mutual exclusion', () => {
    const anyState = applyHasRequestedServicesFilter(base({ requestedServiceId: '9' }), 'true');
    expect(anyState.requestedServiceId).toBeUndefined();
    expect(anyState.hasRequestedServices).toBe('true');
    expect(
      resolveAdmissionsListUrlNavigationMode({
        trigger: 'user_service_card',
        nextQs: workspaceListStateToSearchParams(anyState).toString(),
        currentQs: 'requested_service_id=9',
      }),
    ).toBe('push');

    const noneState = applyHasRequestedServicesFilter(anyState, 'false');
    expect(noneState.hasRequestedServices).toBe('false');
    expect(noneState.requestedServiceId).toBeUndefined();

    const cleared = clearRequestedServicesFilters(noneState);
    expect(cleared.hasRequestedServices).toBeUndefined();
    expect(
      resolveAdmissionsListUrlNavigationMode({
        trigger: 'user_service_chip_clear',
        nextQs: workspaceListStateToSearchParams(cleared).toString(),
        currentQs: workspaceListStateToSearchParams(noneState).toString(),
      }),
    ).toBe('push');
  });

  it('identical service URL does not push a duplicate entry', () => {
    const state = applyRequestedServiceIdFilter(base(), '20');
    const qs = workspaceListStateToSearchParams(state).toString();
    expect(
      resolveAdmissionsListUrlNavigationMode({
        trigger: 'user_service_card',
        nextQs: qs,
        currentQs: qs,
      }),
    ).toBe('skip');
  });
});
