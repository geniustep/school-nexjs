import { currencyCode } from '@/lib/utils/finance';
import type { CashSession } from '@/types/finance-cash-desk';

export function cashSessionCurrency(session: CashSession | null | undefined): string | undefined {
  if (!session) return undefined;
  return currencyCode(session.currency ?? session.currency_code) ?? undefined;
}

export function cashSessionHasCurrency(session: CashSession | null | undefined): boolean {
  return !!cashSessionCurrency(session);
}
