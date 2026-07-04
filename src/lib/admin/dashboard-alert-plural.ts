import type { Locale } from '@/lib/i18n/config';
import { pluralForm } from '@/lib/i18n/count-plural';
import type { TranslateFn } from '@/features/i18n/locale-context';

export type DashboardAlertPluralKind =
  | 'billingAccountFollowup'
  | 'admissionOverdue'
  | 'admissionNew'
  | 'admissionInReview'
  | 'classMissingAttendance'
  | 'studentMissingGuardian'
  | 'studentMissingRequiredData'
  | 'studentMissingMassar'
  | 'studentWithoutClass'
  | 'studentWithoutParent'
  | 'studentWithoutYear'
  | 'studentIncompleteProfile'
  | 'paymentPromiseDue'
  | 'examMissingResults'
  | 'draftResultPending';

export function formatDashboardAlertPlural(
  t: TranslateFn,
  locale: Locale | string,
  kind: DashboardAlertPluralKind,
  count: number,
): string {
  const base = `admin.dashboardAlerts.plural.${kind}`;
  if (count <= 0) return t(`${base}.zero`);
  let form = pluralForm(count, locale as Locale);
  if (form === 'other') form = 'few';
  const key = `${base}.${form}`;
  if (form === 'one' || form === 'two') return t(key);
  return t(key, { count: String(count) });
}
