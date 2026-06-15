import type { Locale } from '@/lib/i18n/config';
import { pluralForm } from '@/lib/i18n/count-plural';
import type { TranslateFn } from '@/features/i18n/locale-context';

export type FinancePluralKind =
  | 'rejectedCheque'
  | 'chequeDueSoon'
  | 'overdueCheque'
  | 'draftCollection'
  | 'overdueInstallment'
  | 'draftAgreement'
  | 'installment'
  | 'cheque'
  | 'student';

export function formatFinancePlural(
  t: TranslateFn,
  locale: Locale,
  kind: FinancePluralKind,
  count: number,
): string {
  if (count <= 0) return t(`admin.finance.hub.plural.${kind}.zero`);
  let form = pluralForm(count, locale);
  if (form === 'other') form = 'few';
  const key = `admin.finance.hub.plural.${kind}.${form}`;
  if (form === 'one' || form === 'two') return t(key);
  return t(key, { count: String(count) });
}
