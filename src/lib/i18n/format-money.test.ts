import { describe, expect, it } from 'vitest';
import { formatFinanceMoney, resolveFinanceCurrency } from '@/lib/i18n/format-money';

describe('formatFinanceMoney', () => {
  it('formats Arabic MAD with space thousands and د.م. suffix', () => {
    expect(formatFinanceMoney(25498, 'MAD', 'ar')).toBe('25 498,00 د.م.');
  });

  it('formats French MAD with MAD suffix', () => {
    expect(formatFinanceMoney(25498, 'MAD', 'fr')).toBe('25 498,00 MAD');
  });

  it('formats English with currency code', () => {
    const formatted = formatFinanceMoney(25498, 'MAD', 'en');
    expect(formatted).toMatch(/MAD/);
    expect(formatted).toMatch(/25,498\.00|25\.498,00/);
  });

  it('returns dash for null amounts', () => {
    expect(formatFinanceMoney(null, 'MAD', 'ar')).toBe('—');
  });
});

describe('resolveFinanceCurrency', () => {
  it('defaults to MAD when currency is missing', () => {
    expect(resolveFinanceCurrency(undefined)).toBe('MAD');
  });
});
