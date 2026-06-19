import type { FinanceReferenceOption } from '../types';
import { hasFinanceSummaryMetrics } from './normalize-student-finance-workspace';

const REF_PREFIX = 'admin.student360.financeOps.ref';

/** Normalize API / display labels to i18n key slugs (e.g. "Period Start" → period_start). */
export function normalizeReferenceValue(value: string): string {
  return value.trim().toLowerCase().replace(/[\s-]+/g, '_');
}

export function referenceLabelKey(group: string, value: string | null | undefined): string {
  if (!value) return '';
  return `${REF_PREFIX}.${group}.${normalizeReferenceValue(value)}`;
}

export function resolveReferenceLabel(
  t: (key: string) => string,
  group: string,
  value: string | null | undefined,
  options?: FinanceReferenceOption[],
): string {
  return resolveFinanceDisplayLabel(t, group, value, options);
}

/** Preferred entry point for agreement / finance table labels — never surfaces raw English API labels when i18n exists. */
export function resolveFinanceDisplayLabel(
  t: (key: string) => string,
  group: string,
  value: string | null | undefined,
  options?: FinanceReferenceOption[],
): string {
  if (!value) return '—';
  const normalized = normalizeReferenceValue(value);

  const groupKey = referenceLabelKey(group, value);
  const groupTranslated = t(groupKey);
  if (groupTranslated !== groupKey) return groupTranslated;

  const known = resolveKnownFinanceLabel(t, value);
  if (known !== value) return known;

  const fromOptions =
    options?.find((o) => o.value === value || normalizeReferenceValue(o.value) === normalized)?.label;
  if (fromOptions?.trim()) {
    const optionKnown = resolveKnownFinanceLabel(t, fromOptions);
    if (optionKnown !== fromOptions) return optionKnown;
    if (normalizeReferenceValue(fromOptions) !== normalized) return fromOptions;
  }

  return value;
}

export function resolveKnownFinanceLabel(t: (key: string) => string, value: string): string {
  const normalized = normalizeReferenceValue(value);
  const groups = [
    'service_category',
    'commitment_type',
    'pricing_unit',
    'schedule_generation_mode',
    'display_rule',
    'first_period_policy',
    'billing_party_type',
    'service_name',
  ];
  for (const group of groups) {
    const key = `${REF_PREFIX}.${group}.${normalized}`;
    const translated = t(key);
    if (translated !== key) return translated;
  }
  return value;
}

export function resolveServiceDisplayName(
  t: (key: string) => string,
  service?: { name?: string | null; category?: string | null; code?: string | null } | null,
): string {
  if (!service) return '—';
  if (service.name?.trim()) {
    const fromName = resolveKnownFinanceLabel(t, service.name);
    if (fromName !== service.name) return fromName;
  }
  if (service.category) {
    const fromCategory = resolveReferenceLabel(t, 'service_category', service.category);
    if (fromCategory !== service.category) return fromCategory;
  }
  if (service.code) {
    const fromCode = resolveKnownFinanceLabel(t, service.code);
    if (fromCode !== service.code) return fromCode;
  }
  return service.name?.trim() || '—';
}

export function resolveAgreementStateLabel(t: (key: string) => string, state: string): string {
  const slug = normalizeReferenceValue(state);
  const key = `admin.student360.financialAgreement.states.${slug}`;
  const translated = t(key);
  return translated === key ? state : translated;
}

export function resolveAdjustmentTypeLabel(
  t: (key: string) => string,
  adjustmentType: string | null | undefined,
): string {
  if (!adjustmentType?.trim()) {
    return t('admin.student360.financialAgreement.adjustments.types.unknown');
  }
  const slug = normalizeReferenceValue(adjustmentType);
  const key = `admin.student360.financialAgreement.adjustments.types.${slug}`;
  const translated = t(key);
  return translated === key
    ? t('admin.student360.financialAgreement.adjustments.types.unknown')
    : translated;
}

export function resolveAdjustmentPolicyLabel(
  t: (key: string) => string,
  policy: string | null | undefined,
): string {
  if (!policy?.trim()) return t('common.dash');
  const slug = normalizeReferenceValue(policy);
  const key = `admin.student360.financialAgreement.adjustments.policies.${slug}`;
  const translated = t(key);
  return translated === key ? policy : translated;
}

export function isInactiveAgreementState(state: string | null | undefined): boolean {
  if (!state) return false;
  const normalized = normalizeReferenceValue(state);
  return ['cancelled', 'terminated', 'completed'].includes(normalized);
}

export function agreementStateTone(
  state: string,
): 'green' | 'amber' | 'red' | 'slate' | 'blue' {
  switch (state) {
    case 'active':
    case 'approved':
    case 'completed':
      return 'green';
    case 'pending_approval':
    case 'amended':
      return 'amber';
    case 'cancelled':
      return 'red';
    case 'draft':
    case 'new':
      return 'blue';
    default:
      return 'slate';
  }
}

export function paymentStatusTone(
  status: string,
): 'green' | 'amber' | 'red' | 'slate' | 'blue' {
  switch (status) {
    case 'paid':
      return 'green';
    case 'partially_paid':
    case 'pending_cheque':
      return 'amber';
    case 'unpaid':
      return 'red';
    default:
      return 'slate';
  }
}

export function timingStatusTone(
  status: string,
): 'green' | 'amber' | 'red' | 'slate' | 'blue' {
  switch (status) {
    case 'due':
      return 'amber';
    case 'overdue':
      return 'red';
    case 'upcoming':
      return 'blue';
    case 'hidden':
      return 'slate';
    default:
      return 'slate';
  }
}

export function scheduleItemStateTone(
  state: string,
): 'green' | 'amber' | 'red' | 'slate' | 'blue' {
  switch (state) {
    case 'planned':
      return 'blue';
    case 'waived':
      return 'green';
    case 'cancelled':
      return 'red';
    default:
      return 'slate';
  }
}

export function chequeLifecycleTone(
  state: string,
): 'green' | 'amber' | 'red' | 'slate' | 'blue' {
  switch (state) {
    case 'cleared':
      return 'green';
    case 'deposited':
    case 'received':
      return 'amber';
    case 'bounced':
    case 'cancelled':
    case 'returned_to_payer':
      return 'red';
    default:
      return 'slate';
  }
}

export function chequeMaturityTone(
  status: string,
): 'green' | 'amber' | 'red' | 'slate' | 'blue' {
  switch (status) {
    case 'settled':
      return 'green';
    case 'due_today':
      return 'amber';
    case 'overdue':
      return 'red';
    default:
      return 'slate';
  }
}

export function hasFinanceSummaryData(summary: {
  total_due?: number;
  total_agreed?: number;
  confirmed_paid?: number;
  pending_cheques?: number;
  remaining?: number;
  uncovered?: number;
  overdue?: number;
} | null | undefined): boolean {
  return hasFinanceSummaryMetrics(summary);
}

export function hasAgreementData(agreement: { id?: number; state?: string } | null | undefined): boolean {
  return !!agreement?.id;
}
