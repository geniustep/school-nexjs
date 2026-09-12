'use client';

import { api } from '@/lib/api/client';
import type { ReceiptHtmlPrintLang } from '@/lib/utils/finance-receipt-html-print';
import type { ReceiptPrintLayout } from '@/lib/utils/normalize-finance-receipt';

export interface FinanceReceiptSettings {
  default_print_layout: ReceiptPrintLayout;
  default_language: ReceiptHtmlPrintLang;
  print_layout_options: ReceiptPrintLayout[];
  language_options: ReceiptHtmlPrintLang[];
}

const RECEIPT_SETTINGS_PATH = '/admin/finance/receipt-settings';

const RECEIPT_PRINT_LAYOUTS: readonly ReceiptPrintLayout[] = [
  'a4',
  'a5',
  'thermal_80mm',
  'a5_dual_a6_family',
];

function isReceiptPrintLayout(value: unknown): value is ReceiptPrintLayout {
  return typeof value === 'string' && RECEIPT_PRINT_LAYOUTS.includes(value as ReceiptPrintLayout);
}

function isReceiptPrintLanguage(value: unknown): value is ReceiptHtmlPrintLang {
  return value === 'ar' || value === 'fr';
}

export function normalizeFinanceReceiptSettings(raw: unknown): FinanceReceiptSettings | null {
  if (!raw || typeof raw !== 'object') return null;
  const source = raw as Record<string, unknown>;
  if (!isReceiptPrintLayout(source.default_print_layout)) return null;
  if (!isReceiptPrintLanguage(source.default_language)) return null;
  if (!Array.isArray(source.print_layout_options) || !Array.isArray(source.language_options)) {
    return null;
  }

  const printLayoutOptions = source.print_layout_options.filter(isReceiptPrintLayout);
  const languageOptions = source.language_options.filter(isReceiptPrintLanguage);
  if (!printLayoutOptions.length || !languageOptions.length) return null;

  return {
    default_print_layout: source.default_print_layout,
    default_language: source.default_language,
    print_layout_options: printLayoutOptions,
    language_options: languageOptions,
  };
}

export async function fetchFinanceReceiptSettings(
  signal?: AbortSignal,
): Promise<FinanceReceiptSettings | null> {
  const response = await api.get<unknown>(RECEIPT_SETTINGS_PATH, undefined, { signal });
  if (!response.success) return null;
  return normalizeFinanceReceiptSettings(response.data);
}
