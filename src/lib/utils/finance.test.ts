import { describe, expect, it } from 'vitest';
import { currencyCode } from '@/lib/utils/finance';

describe('currencyCode', () => {
  it('returns string codes as-is', () => {
    expect(currencyCode('MAD')).toBe('MAD');
  });

  it('extracts name or symbol from journal currency objects', () => {
    expect(currencyCode({ id: 1, name: 'MAD', symbol: 'DH' })).toBe('MAD');
    expect(currencyCode({ id: 1, symbol: 'DH' })).toBe('DH');
  });
});
