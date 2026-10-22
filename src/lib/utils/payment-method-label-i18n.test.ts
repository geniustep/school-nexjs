import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { paymentMethodLabel } from '@/lib/utils/finance';

type Locale = 'ar' | 'fr' | 'en' | 'es';

function translator(locale: Locale): (key: string) => string {
  const messages = JSON.parse(
    readFileSync(resolve(process.cwd(), 'messages', `${locale}.json`), 'utf8'),
  ) as Record<string, unknown>;
  return (key) => {
    const value = key.split('.').reduce<unknown>((node, part) => (
      node && typeof node === 'object'
        ? (node as Record<string, unknown>)[part]
        : undefined
    ), messages);
    return typeof value === 'string' ? value : key;
  };
}

describe('payment method labels in the collection drawers', () => {
  it.each([
    ['fr', 'Espèces', 'Virement bancaire', 'Chèque'],
    ['ar', 'نقدًا', 'تحويل بنكي', 'شيك'],
    ['en', 'Cash', 'Transfer', 'Cheque'],
    ['es', 'Efectivo', 'Transferencia', 'Cheque'],
  ] as const)('renders cash, bank transfer and cheque in %s', (locale, cash, transfer, cheque) => {
    const t = translator(locale);
    expect(paymentMethodLabel('cash', t)).toBe(cash);
    expect(paymentMethodLabel('bank_transfer', t)).toBe(transfer);
    expect(paymentMethodLabel('cheque', t)).toBe(cheque);
  });

  it('handles bank transfer codes and API method objects without leaking enum labels', () => {
    const t = translator('fr');
    expect(paymentMethodLabel({ code: 'bank_transfer' }, t)).toBe('Virement bancaire');
    expect(paymentMethodLabel('transfer', t)).toBe('Virement');
    expect(paymentMethodLabel('bank', t)).toBe('Virement');
    expect(paymentMethodLabel('bank_transfer', t)).not.toBe('bank_transfer');
  });

  it('preserves unrecognized codes without mutating payment data', () => {
    const t = translator('fr');
    expect(paymentMethodLabel('unknown_method', t)).toBe('unknown_method');
  });
});
