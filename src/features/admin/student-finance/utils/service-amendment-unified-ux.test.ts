import { describe, expect, it } from 'vitest';
import {
  resolveAutomaticRemovalEffectivePeriodId,
  resolveUnifiedModifyIntent,
  samePeriodSelection,
} from './service-amendment-unified-ux';

describe('unified service amendment UX', () => {
  it('compares final included-period sets without depending on ordering', () => {
    expect(samePeriodSelection(['3', '1', '2'], ['2', '3', '1'])).toBe(true);
    expect(samePeriodSelection(['1', '2'], ['1', '3'])).toBe(false);
  });

  it('routes duration-only changes to period reconciliation intent', () => {
    expect(
      resolveUnifiedModifyIntent({
        currentPeriodIds: ['1', '2'],
        selectedPeriodIds: ['1', '2', '3'],
        currentAmount: 250,
        nextAmountRaw: '250',
      }),
    ).toBe('periods');
  });

  it('routes price-only changes to price intent', () => {
    expect(
      resolveUnifiedModifyIntent({
        currentPeriodIds: ['1', '2'],
        selectedPeriodIds: ['2', '1'],
        currentAmount: 250,
        nextAmountRaw: '300',
      }),
    ).toBe('price');
  });

  it('blocks combined price and duration changes until an atomic backend contract exists', () => {
    expect(
      resolveUnifiedModifyIntent({
        currentPeriodIds: ['1', '2'],
        selectedPeriodIds: ['1', '2', '3'],
        currentAmount: 250,
        nextAmountRaw: '300',
      }),
    ).toBe('combined');
  });

  it('reports no-op when neither price nor duration changed', () => {
    expect(
      resolveUnifiedModifyIntent({
        currentPeriodIds: ['1', '2'],
        selectedPeriodIds: ['2', '1'],
        currentAmount: 250,
        nextAmountRaw: '250',
      }),
    ).toBe('none');
  });

  it('chooses the current or next billing period automatically for full-service removal', () => {
    const periods = [
      { id: 10, label: 'September 2026', periodStart: '2026-09-01', periodEnd: '2026-09-30' },
      { id: 11, label: 'October 2026', periodStart: '2026-10-01', periodEnd: '2026-10-31' },
      { id: 12, label: 'November 2026', periodStart: '2026-11-01', periodEnd: '2026-11-30' },
    ];
    expect(resolveAutomaticRemovalEffectivePeriodId(periods, '2026-10-07')).toBe('11');
  });
});
