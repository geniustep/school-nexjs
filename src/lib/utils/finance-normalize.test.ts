import { describe, expect, it } from 'vitest';
import {
  normalizePaymentMethodCode,
  normalizePaymentMethodOptions,
} from '@/lib/utils/finance-normalize';

describe('normalizePaymentMethodOptions', () => {
  it('keeps string codes', () => {
    expect(normalizePaymentMethodOptions(['cash', 'cheque'])).toEqual([
      { code: 'cash' },
      { code: 'cheque' },
    ]);
  });

  it('extracts code and label from object entries', () => {
    expect(
      normalizePaymentMethodOptions([
        { code: 'cash', name: 'Espèces' },
        { code: 'cheque', label: 'Chèque' },
      ]),
    ).toEqual([
      { code: 'cash', label: 'Espèces' },
      { code: 'cheque', label: 'Chèque' },
    ]);
  });

  it('deduplicates by code', () => {
    expect(
      normalizePaymentMethodOptions([
        { code: 'cash', name: 'Cash A' },
        { code: 'cash', name: 'Cash B' },
      ]),
    ).toEqual([{ code: 'cash', label: 'Cash A' }]);
  });
});

describe('normalizePaymentMethodCode', () => {
  it('returns empty for nullish values', () => {
    expect(normalizePaymentMethodCode(null)).toBe('');
    expect(normalizePaymentMethodCode(undefined)).toBe('');
  });
});
