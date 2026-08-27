import { describe, expect, it } from 'vitest';
import type { FeeType } from '@/types/finance';
import type { FinanceServiceCatalogItem } from '@/features/admin/student-finance/types';
import { feeTypesBackedByServiceCatalog } from './fee-service-catalog-adapter';

const feeTypes: FeeType[] = [
  { id: 11, code: 'REG', name: 'Old registration', school_id: 1, default_amount: 999 },
  { id: 12, code: 'TUITION', name: 'Old tuition', school_id: 1, default_amount: 999 },
  { id: 13, code: 'TRANSPORT', name: 'Old transport', school_id: 1, default_amount: 999 },
];

const services: FinanceServiceCatalogItem[] = [
  { id: 501, code: 'REGISTRATION', name: 'التسجيل', active: true, default_amount: 2500 },
  { id: 502, code: 'TUITION', name: 'التمدرس', active: true, frequency: 'monthly', default_amount: 2800 },
  { id: 503, code: 'TRANSPORT', name: 'النقل', active: true, frequency: 'monthly', default_amount: 500 },
];

describe('fee service catalog adapter', () => {
  it('uses service catalog display metadata but preserves backing fee_type ids', () => {
    const result = feeTypesBackedByServiceCatalog(services, feeTypes);
    expect(result.map((item) => [item.id, item.code, item.name])).toEqual([
      [11, 'REGISTRATION', 'التسجيل'],
      [12, 'TUITION', 'التمدرس'],
      [13, 'TRANSPORT', 'النقل'],
    ]);
  });

  it('never adopts service default_amount as fee-plan price', () => {
    const result = feeTypesBackedByServiceCatalog(services, feeTypes);
    expect(result.find((item) => item.id === 12)?.default_amount).toBe(999);
  });

  it('drops a service when there is no unique backing fee type', () => {
    const result = feeTypesBackedByServiceCatalog(
      [{ id: 700, code: 'BOOKS', name: 'الكتب', active: true }],
      feeTypes,
    );
    expect(result).toEqual([]);
  });
});
