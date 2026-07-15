import type {
  AgreementCustomization,
  AgreementFinancialSummary,
  AgreementFinanceSummarySource,
} from '@/types/agreement-finance-summary';
import type { SpecialAgreementSummary } from '@/types/student-financial-overview';
import type { FinancialAgreement, InactiveAgreementSummary } from '../types';
import {
  isPreActiveAgreementState,
  resolvePreActiveFinancialAgreement,
} from './resolve-pre-active-financial-agreement';

export interface DraftAgreementPresentation {
  hasDraftAgreement: boolean;
  agreementId: number | null;
  state: string | null;
  isPlanCustomized: boolean;
  createsDueAfterConfirmation: boolean;
  summary: AgreementFinancialSummary | null;
  customizations: AgreementCustomization[];
  enrollmentCustomizations: AgreementCustomization[];
  totalsMismatch: boolean;
  allowedActions: Record<string, boolean>;
}

function readNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

export function resolveSpecialAgreementId(
  agreement: SpecialAgreementSummary | null | undefined,
): number | null {
  if (!agreement) return null;
  if (typeof agreement.id === 'number') return agreement.id;
  if (typeof agreement.agreement_id === 'number') return agreement.agreement_id;
  return null;
}

export function resolveAgreementFinanceSummary(
  source: AgreementFinanceSummarySource | null | undefined,
): AgreementFinancialSummary | null {
  if (!source) return null;

  const fromFinancial = source.financial_summary ?? null;
  const fromDraft = source.draft_totals ?? null;
  const merged: AgreementFinancialSummary = {
    ...fromDraft,
    ...fromFinancial,
  };

  const summary: AgreementFinancialSummary = {
    original_total:
      readNumber(merged.original_total) ??
      readNumber(source.original_total) ??
      readNumber(source.gross_amount),
    discount_total:
      readNumber(merged.discount_total) ?? readNumber(source.discount_total) ?? readNumber(source.discount_amount),
    surcharge_total: readNumber(merged.surcharge_total) ?? readNumber(source.surcharge_total),
    net_total:
      readNumber(merged.net_total) ??
      readNumber(merged.final_total) ??
      readNumber(source.net_total) ??
      readNumber(source.net_amount) ??
      readNumber(source.total_amount),
    final_total:
      readNumber(merged.final_total) ??
      readNumber(merged.net_total) ??
      readNumber(source.net_total) ??
      readNumber(source.net_amount) ??
      readNumber(source.total_amount),
    one_time_total: readNumber(merged.one_time_total),
    recurring_total_after_discount: readNumber(merged.recurring_total_after_discount),
    monthly_due_amount: readNumber(merged.monthly_due_amount),
    schedule_total: readNumber(merged.schedule_total),
    paid_amount: readNumber(merged.paid_amount),
    remaining_amount: readNumber(merged.remaining_amount),
  };

  const hasValue = Object.values(summary).some((value) => value != null);
  return hasValue ? summary : null;
}

export function agreementCustomizationIdentityKey(item: AgreementCustomization): string {
  if (item.scope === 'period') {
    const count = item.periods?.filter((period) => period.selected !== false).length ?? 0;
    const keys =
      item.periods
        ?.map((period) => period.period_key)
        .sort()
        .join(',') ?? '';
    return `period:${count}:${keys}`;
  }

  return [
    item.kind ?? '',
    item.scope ?? '',
    String(item.line_id ?? ''),
    item.line_name?.trim() ?? '',
    item.discount_type ?? '',
    String(item.discount_value ?? ''),
    item.due_date_override ?? '',
  ].join('|');
}

function dedupeAgreementCustomizations(items: AgreementCustomization[]): AgreementCustomization[] {
  const seen = new Set<string>();
  const result: AgreementCustomization[] = [];
  for (const item of items) {
    const key = agreementCustomizationIdentityKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
}

function readCustomizationsFromSource(
  source:
    | {
        customizations?: AgreementCustomization[] | null;
        enrollment_customizations?: AgreementCustomization[] | null;
      }
    | null
    | undefined,
): AgreementCustomization[] {
  if (!source) return [];
  if (Array.isArray(source.customizations) && source.customizations.length > 0) {
    return source.customizations;
  }
  return source.enrollment_customizations ?? [];
}

export function resolveAgreementCustomizations(
  ...sources: Array<{ customizations?: AgreementCustomization[] | null; enrollment_customizations?: AgreementCustomization[] | null } | null | undefined>
): AgreementCustomization[] {
  const merged: AgreementCustomization[] = [];
  for (const source of sources) {
    merged.push(...readCustomizationsFromSource(source));
  }
  return dedupeAgreementCustomizations(merged);
}

export function splitEnrollmentCustomizations(customizations: AgreementCustomization[]): {
  enrollmentCustomizations: AgreementCustomization[];
  laterCustomizations: AgreementCustomization[];
} {
  const enrollmentCustomizations: AgreementCustomization[] = [];
  const laterCustomizations: AgreementCustomization[] = [];
  for (const item of customizations) {
    if (item.kind === 'enrollment_customization') {
      enrollmentCustomizations.push(item);
    } else {
      laterCustomizations.push(item);
    }
  }
  return { enrollmentCustomizations, laterCustomizations };
}

export function isPresentableDraftSpecialAgreement(
  agreement: SpecialAgreementSummary | null | undefined,
): boolean {
  if (!agreement || agreement.exists === false) return false;
  if (!isPreActiveAgreementState(agreement.state)) return false;
  if (agreement.empty_draft) return false;
  if (resolveSpecialAgreementId(agreement) == null) return false;

  const summary = resolveAgreementFinanceSummary(agreement);
  const hasTotals =
    (summary?.final_total ?? summary?.net_total ?? agreement.total_amount ?? agreement.net_amount ?? 0) > 0;
  const hasCustomizations = (agreement.customizations?.length ?? 0) > 0;
  const hasLines = (agreement.line_count ?? 0) > 0;
  return hasTotals || hasCustomizations || hasLines;
}

export function isPresentableDraftFinancialAgreement(
  agreement: FinancialAgreement | null | undefined,
): boolean {
  if (!agreement || !isPreActiveAgreementState(agreement.state)) return false;
  if (agreement.empty_draft) return false;

  const summary = resolveAgreementFinanceSummary(agreement);
  const hasTotals =
    (summary?.final_total ?? summary?.net_total ?? agreement.net_amount ?? agreement.total_amount ?? 0) > 0;
  const hasCustomizations = (agreement.customizations?.length ?? 0) > 0;
  const hasLines = (agreement.lines?.length ?? agreement.line_count ?? 0) > 0;
  return hasTotals || hasCustomizations || hasLines || agreement.id != null;
}

export function resolveDraftAgreementPresentation(input: {
  financialOverview?: { special_agreement?: SpecialAgreementSummary | null } | null;
  workspaceAgreement?: FinancialAgreement | null;
  agreementDetail?: FinancialAgreement | null;
  inactiveAgreement?: InactiveAgreementSummary | null;
  agreementsList?: FinancialAgreement[] | null;
  academicYearId?: number | null;
}): DraftAgreementPresentation {
  const special = input.financialOverview?.special_agreement ?? null;
  const workspaceAgreement = input.workspaceAgreement ?? null;
  const agreementDetail = input.agreementDetail ?? null;
  const agreement = agreementDetail ?? workspaceAgreement;

  const preActive = resolvePreActiveFinancialAgreement({
    specialAgreement: special,
    workspaceAgreement,
    agreementDetail,
    inactiveAgreement: input.inactiveAgreement,
    agreementsList: input.agreementsList,
    academicYearId: input.academicYearId,
  });

  const hasDraftAgreement =
    preActive != null ||
    isPresentableDraftSpecialAgreement(special) ||
    isPresentableDraftFinancialAgreement(agreement);

  const agreementId =
    preActive?.id ??
    resolveSpecialAgreementId(special) ??
    (typeof agreement?.id === 'number' ? agreement.id : null);

  const summary =
    resolveAgreementFinanceSummary(agreementDetail) ??
    resolveAgreementFinanceSummary(special) ??
    resolveAgreementFinanceSummary(workspaceAgreement);

  const customizations = resolveAgreementCustomizations(special, agreementDetail, workspaceAgreement);
  const { enrollmentCustomizations } = splitEnrollmentCustomizations(customizations);

  const finalTotal = summary?.final_total ?? summary?.net_total;
  // Compare current operational totals only — never historical_schedule_summary.
  const currentScheduleTotal =
    (typeof agreementDetail?.schedule_summary?.total_amount === 'number'
      ? agreementDetail.schedule_summary.total_amount
      : undefined) ??
    (typeof workspaceAgreement?.schedule_summary?.total_amount === 'number'
      ? workspaceAgreement.schedule_summary.total_amount
      : undefined) ??
    summary?.schedule_total;
  const totalsMismatch =
    finalTotal != null &&
    currentScheduleTotal != null &&
    Math.abs(finalTotal - currentScheduleTotal) > 0.009;

  return {
    hasDraftAgreement,
    agreementId,
    state: preActive?.state ?? agreement?.state ?? special?.state ?? null,
    isPlanCustomized: agreement?.is_plan_customized === true || special?.is_plan_customized === true,
    createsDueAfterConfirmation:
      agreement?.creates_due_after_confirmation === true ||
      special?.creates_due_after_confirmation === true,
    summary,
    customizations,
    enrollmentCustomizations,
    totalsMismatch,
    allowedActions: agreement?.allowed_actions ?? {},
  };
}

export function shouldSuppressFinanceEmptyState(presentation: DraftAgreementPresentation): boolean {
  return presentation.hasDraftAgreement;
}

export function formatEnrollmentCustomizationLabel(
  customization: AgreementCustomization,
  t: (key: string, values?: Record<string, string | number>) => string,
  formatDate: (value: string) => string,
  formatReason: (reason: string) => string,
): string {
  const lineName = customization.line_name?.trim() || t('common.dash');

  if (customization.scope === 'line' && customization.discount_type === 'percent') {
    const reason = customization.reason ? formatReason(customization.reason) : t('common.dash');
    return t('admin.student360.financeWorkspace.draftAgreement.customizationLinePercent', {
      line: lineName,
      percent: customization.discount_value ?? 0,
      reason,
    });
  }

  if (customization.scope === 'one_time' && customization.due_date_override) {
    return t('admin.student360.financeWorkspace.draftAgreement.customizationDueDateOverride', {
      line: lineName,
      date: formatDate(customization.due_date_override),
    });
  }

  if (customization.scope === 'period' && Array.isArray(customization.periods)) {
    const count = customization.periods.filter((period) => period.selected !== false).length;
    return t('admin.student360.financeWorkspace.draftAgreement.customizationSelectedPeriods', {
      count,
    });
  }

  if (customization.line_name?.trim()) return customization.line_name.trim();
  return customization.scope ?? t('common.dash');
}
