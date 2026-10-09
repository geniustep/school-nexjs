import { describe, expect, it } from 'vitest';
import { hasUserChangedServiceDuration } from './agreement-amendment-user-intent';

describe('agreement amendment user intent', () => {
  it('does not treat an automatically removed locked period as a user duration change', () => {
    expect(
      hasUserChangedServiceDuration({
        userEditedDuration: false,
        currentPeriodIds: ['sep', 'oct', 'nov'],
        selectedPeriodIds: ['oct', 'nov'],
        blockedPeriodIds: ['sep'],
      }),
    ).toBe(false);
  });

  it('still detects a real user duration change while ignoring locked history', () => {
    expect(
      hasUserChangedServiceDuration({
        userEditedDuration: true,
        currentPeriodIds: ['sep', 'oct', 'nov'],
        selectedPeriodIds: ['oct'],
        blockedPeriodIds: ['sep'],
      }),
    ).toBe(true);
  });

  it('returns to no duration change when the user restores the original open-period selection', () => {
    expect(
      hasUserChangedServiceDuration({
        userEditedDuration: true,
        currentPeriodIds: ['sep', 'oct', 'nov'],
        selectedPeriodIds: ['nov', 'oct'],
        blockedPeriodIds: ['sep'],
      }),
    ).toBe(false);
  });
});
