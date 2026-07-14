import { describe, expect, it } from 'vitest';
import {
  isUserServiceFilterNavTrigger,
  resolveAdmissionsListUrlNavigationMode,
} from './admission-url-navigation';

describe('admission URL navigation mode', () => {
  it('uses push for user service card / filter / chip clear / clear filters', () => {
    for (const trigger of [
      'user_service_card',
      'user_service_filter',
      'user_service_chip_clear',
      'user_clear_filters',
    ] as const) {
      expect(
        resolveAdmissionsListUrlNavigationMode({
          trigger,
          nextQs: 'requested_service_ids=1',
          currentQs: '',
        }),
      ).toBe('push');
      expect(isUserServiceFilterNavTrigger(trigger)).toBe(true);
    }
  });

  it('uses push for status filter, academic filter, and view switch', () => {
    for (const trigger of [
      'user_status_filter',
      'user_academic_filter',
      'user_view_switch',
    ] as const) {
      expect(
        resolveAdmissionsListUrlNavigationMode({
          trigger,
          nextQs: 'application_status=accepted',
          currentQs: '',
        }),
      ).toBe('push');
    }
  });

  it('uses replace for hydration and search debounce', () => {
    expect(
      resolveAdmissionsListUrlNavigationMode({
        trigger: 'url_hydration',
        nextQs: 'q=x',
        currentQs: '',
      }),
    ).toBe('replace');
    expect(
      resolveAdmissionsListUrlNavigationMode({
        trigger: 'search_debounce',
        nextQs: 'q=ab',
        currentQs: 'q=a',
      }),
    ).toBe('replace');
  });

  it('skips when next URL equals current (no duplicate history)', () => {
    expect(
      resolveAdmissionsListUrlNavigationMode({
        trigger: 'user_service_card',
        nextQs: 'requested_service_ids=9',
        currentQs: 'requested_service_ids=9',
      }),
    ).toBe('skip');
  });

  it('treats transport then canteen as two pushable entries', () => {
    const first = resolveAdmissionsListUrlNavigationMode({
      trigger: 'user_service_card',
      nextQs: 'requested_service_ids=10&view=table',
      currentQs: 'view=table',
    });
    const second = resolveAdmissionsListUrlNavigationMode({
      trigger: 'user_service_card',
      nextQs: 'requested_service_ids=11&view=table',
      currentQs: 'requested_service_ids=10&view=table',
    });
    expect(first).toBe('push');
    expect(second).toBe('push');
  });
});
