import { expect, it } from 'vitest';
import { ADMISSION_TABS, mapLegacyAdmissionTab } from './admission-detail-tabs';
it('63-64. compatibility', () => {
  expect(ADMISSION_TABS.includes('offer_registration')).toBe(true);
  expect(mapLegacyAdmissionTab('offers')).toBe('offer_registration');
});
