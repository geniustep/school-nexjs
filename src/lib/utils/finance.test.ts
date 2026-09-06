import { describe, expect, it } from 'vitest';
import { currencyCode, paymentMethodLabel } from '@/lib/utils/finance';

const t = (key: string) => {
  const messages: Record<string, string> = {
    'admin.finance.methodCash': 'Cash',
    'common.dash': '—',
  };
  return messages[key] ?? key;
};

describe('currencyCode', () => {
  it('returns string codes as-is', () => {
    expect(currencyCode('MAD')).toBe('MAD');
  });

  it('extracts name or symbol from journal currency objects', () => {
    expect(currencyCode({ id: 1, name: 'MAD', symbol: 'DH' })).toBe('MAD');
    expect(currencyCode({ id: 1, symbol: 'DH' })).toBe('DH');
  });
});

describe('paymentMethodLabel', () => {
  it('never exposes the imported unknown-method technical enum', () => {
    expect(paymentMethodLabel('import_unspecified', t)).toBe('—');
    expect(paymentMethodLabel({ code: 'import_unspecified' }, t)).toBe('—');
  });

  it('renders imported unknown methods as localized human-facing labels', () => {
    expect(paymentMethodLabel('import_unspecified', t, 'fr')).toBe('Non renseigné');
    expect(paymentMethodLabel('import_unspecified', t, 'ar')).toBe('غير محددة');
    expect(paymentMethodLabel('import_unspecified', t, 'en')).toBe('Not provided');
    expect(paymentMethodLabel('import_unspecified', t, 'es')).toBe('No indicado');
  });

  it('preserves established labels for ordinary known payment methods', () => {
    expect(paymentMethodLabel('cash', t, 'fr')).toBe('Cash');
  });
});