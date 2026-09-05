export type ReceiptHtmlPrintLang = 'ar' | 'fr';

export function normalizeReceiptHtmlPrintLang(
  value: string | null | undefined,
): ReceiptHtmlPrintLang {
  return value === 'fr' ? 'fr' : 'ar';
}

export function buildReceiptHtmlPrintPath(
  receiptId: number | string,
  lang: ReceiptHtmlPrintLang,
  options: { autoPrint?: boolean } = {},
): string {
  const params = new URLSearchParams({ lang });
  if (options.autoPrint !== false) params.set('auto', '1');
  return `/admin/finance/receipts/${encodeURIComponent(String(receiptId))}/print?${params.toString()}`;
}
