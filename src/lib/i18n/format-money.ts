import type { Locale } from './config';
import { currencyCode } from '@/lib/utils/finance';

const DEFAULT_FINANCE_CURRENCY = 'MAD';

function formatAmountDigits(amount: number, locale: Locale): string {
  if (locale === 'ar' || locale === 'fr') {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
      .format(amount)
      .replace(/\u202f/g, ' ');
  }
  const bcp47 = locale === 'es' ? 'es-ES' : 'en-US';
  return new Intl.NumberFormat(bcp47, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function financeCurrencySymbol(code: string, locale: Locale): string {
  if (code === 'MAD') {
    if (locale === 'ar') return 'د.م.';
    return 'MAD';
  }
  return code;
}

/** Locale-aware money formatting for finance dashboards. */
export function formatFinanceMoney(
  amount: number | null | undefined,
  currency: unknown,
  locale: Locale,
): string {
  if (amount == null || Number.isNaN(amount)) return '—';
  const code = currencyCode(currency) ?? DEFAULT_FINANCE_CURRENCY;
  const digits = formatAmountDigits(amount, locale);

  if (locale === 'ar' || locale === 'fr') {
    return `${digits} ${financeCurrencySymbol(code, locale)}`;
  }

  try {
    return new Intl.NumberFormat(locale === 'es' ? 'es-ES' : 'en-US', {
      style: 'currency',
      currency: code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${digits} ${code}`;
  }
}

export function resolveFinanceCurrency(currency: unknown): string {
  return currencyCode(currency) ?? DEFAULT_FINANCE_CURRENCY;
}
