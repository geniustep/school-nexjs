import { describe, expect, it } from 'vitest';
import {
  agreementLineCategoryDetails,
  extractCanteenDetails,
  extractTransportDetails,
  hasAgreementLineCategoryDetails,
  subscriptionCategoryDetails,
} from './service-category-details';

describe('service category details', () => {
  it('renders canteen fields only when API provides values', () => {
    expect(extractCanteenDetails(null)).toEqual([]);
    expect(extractCanteenDetails({ subscription_type: 'monthly', extra_unit_price: 15 })).toEqual([
      { key: 'subscriptionType', value: 'monthly' },
      { key: 'extraUnitPrice', value: '15' },
    ]);
  });

  it('renders transport fields only when API provides values', () => {
    expect(extractTransportDetails({})).toEqual([]);
    expect(
      extractTransportDetails({
        line: { name: 'Line A' },
        zone: 'North',
        selected_days: ['Mon', 'Wed'],
      }),
    ).toEqual([
      { key: 'line', value: 'Line A' },
      { key: 'zone', value: 'North' },
      { key: 'selectedDays', value: 'Mon, Wed' },
    ]);
  });

  it('does not expose placeholder rows for agreement lines', () => {
    const line = {
      id: 1,
      service: { id: 10, name: 'Canteen', category: 'canteen' },
      canteen_settings: {},
    } as import('../types').FinancialAgreementLine;
    expect(agreementLineCategoryDetails(line)).toEqual([]);
    expect(hasAgreementLineCategoryDetails(line)).toBe(false);
  });

  it('maps subscription transport details without guessing', () => {
    const sub = {
      id: 2,
      service: { id: 20, name: 'Transport', category: 'transport' },
      transport_details: { direction: 'round_trip' },
    } as import('../types').ServiceSubscription;
    expect(subscriptionCategoryDetails(sub)).toEqual([{ key: 'direction', value: 'round_trip' }]);
  });
});
