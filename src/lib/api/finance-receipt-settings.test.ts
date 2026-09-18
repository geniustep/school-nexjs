import { describe, expect, it } from 'vitest';
import { normalizeFinanceReceiptSettings } from '@/lib/api/finance-receipt-settings';

describe('finance receipt settings contract', () => {
  it('accepts the canonical Odoo receipt settings payload', () => {
    expect(
      normalizeFinanceReceiptSettings({
        default_print_layout: 'a5_dual_a6_family',
        default_language: 'fr',
        print_layout_options: ['a4', 'a5', 'thermal_80mm', 'a5_dual_a6_family'],
        language_options: ['ar', 'fr'],
      }),
    ).toEqual({
      default_print_layout: 'a5_dual_a6_family',
      default_language: 'fr',
      print_layout_options: ['a4', 'a5', 'thermal_80mm', 'a5_dual_a6_family'],
      language_options: ['ar', 'fr'],
    });
  });

  it('rejects unsupported default languages so callers can use the legacy fallback', () => {
    expect(
      normalizeFinanceReceiptSettings({
        default_print_layout: 'a5',
        default_language: 'es',
        print_layout_options: ['a4', 'a5'],
        language_options: ['ar', 'fr'],
      }),
    ).toBeNull();
  });
});
