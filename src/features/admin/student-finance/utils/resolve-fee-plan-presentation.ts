import type { StudentDetailsData } from '@/types/student-360';
import type { StudentFinancialOverview } from '@/types/student-financial-overview';
import type { FinancialAgreement, StudentFinanceWorkspace } from '../types';
import type { FinanceAgreementUiStatus, FinanceFeePlanPresentation } from '../types/agreement-context';
import { normalizeReferenceValue } from './reference-labels';
import { hasActiveFinancialAgreement } from './resolve-student-billing-source-presentation';

const INACTIVE_STATES = new Set(['cancelled', 'terminated', 'expired', 'superseded', 'completed']);

function readAgreementRef(agreement: FinancialAgreement | null | undefined): string | null {
  if (!agreement) return null;
  if (typeof agreement.number === 'string' && agreement.number.trim()) return agreement.number.trim();
  if (typeof agreement.name === 'string' && agreement.name.trim()) return agreement.name.trim();
  if (agreement.id != null) return `#${agreement.id}`;
  return null;
}

function readFeePlanFromWorkspace(workspace?: StudentFinanceWorkspace | null): {
  id: number | null;
  name: string | null;
} {
  if (!workspace) return { id: null, name: null };
  const raw = workspace as StudentFinanceWorkspace & {
    fee_plan_used?: { id?: number; name?: string | null } | null;
    fee_plan_id?: number | null;
    fee_plan_name?: string | null;
  };
  const fromUsed = raw.fee_plan_used;
  if (fromUsed && typeof fromUsed === 'object') {
    const id = typeof fromUsed.id === 'number' ? fromUsed.id : null;
    const name = typeof fromUsed.name === 'string' && fromUsed.name.trim() ? fromUsed.name.trim() : null;
    if (id != null || name) return { id, name };
  }
  const id = typeof raw.fee_plan_id === 'number' ? raw.fee_plan_id : null;
  const name = typeof raw.fee_plan_name === 'string' && raw.fee_plan_name.trim() ? raw.fee_plan_name.trim() : null;
  return { id, name };
}

function readFeePlanFromAgreement(agreement: FinancialAgreement | null | undefined): {
  id: number | null;
  name: string | null;
} {
  if (!agreement) return { id: null, name: null };
  const raw = agreement as FinancialAgreement & {
    fee_plan_id?: number | null;
    fee_plan_name?: string | null;
    original_fee_plan_name?: string | null;
    fee_plan?: { id?: number; name?: string | null } | null;
  };
  const id =
    typeof raw.fee_plan?.id === 'number'
      ? raw.fee_plan.id
      : typeof raw.fee_plan_id === 'number'
        ? raw.fee_plan_id
        : null;
  const name =
    (typeof raw.fee_plan?.name === 'string' && raw.fee_plan.name.trim()
      ? raw.fee_plan.name.trim()
      : null) ??
    (typeof raw.fee_plan_name === 'string' && raw.fee_plan_name.trim()
      ? raw.fee_plan_name.trim()
      : null) ??
    (typeof raw.original_fee_plan_name === 'string' && raw.original_fee_plan_name.trim()
      ? raw.original_fee_plan_name.trim()
      : null);
  return { id, name };
}

function readBillingPartnerLabel(workspace?: StudentFinanceWorkspace | null): string | null {
  const partner =
    workspace?.billing_partner ??
    workspace?.finance_profile?.billing_partner ??
    workspace?.current_agreement?.billing_partner ??
    null;
  if (!partner || typeof partner !== 'object') return null;
  const name = typeof partner.name === 'string' && partner.name.trim() ? partner.name.trim() : null;
  return name;
}

function resolveDisplayedAgreement(input: {
  workspace?: StudentFinanceWorkspace | null;
  financialOverview?: StudentFinancialOverview | null;
}): FinancialAgreement | null {
  const hasActive = hasActiveFinancialAgreement({
    workspace: input.workspace,
    workspaceAgreement: input.workspace?.current_agreement ?? null,
    financialOverview: input.financialOverview,
  });
  if (hasActive && input.workspace?.current_agreement) {
    return input.workspace.current_agreement;
  }

  const inactive = input.workspace?.inactive_agreement;
  if (inactive?.id != null) {
    const current = input.workspace?.current_agreement;
    if (current?.id === inactive.id) return current;
    if (current && INACTIVE_STATES.has(normalizeReferenceValue(current.state))) {
      return {
        id: inactive.id,
        student_id: input.workspace?.student?.id ?? 0,
        state: inactive.state ?? 'cancelled',
        number: readAgreementRef(current) ?? `#${inactive.id}`,
      };
    }
    return {
      id: inactive.id,
      student_id: input.workspace?.student?.id ?? 0,
      state: inactive.state ?? 'cancelled',
      number: `#${inactive.id}`,
    };
  }

  const current = input.workspace?.current_agreement;
  if (current?.state && !INACTIVE_STATES.has(normalizeReferenceValue(current.state))) {
    return current;
  }
  if (current) return current;

  const special = input.financialOverview?.special_agreement;
  if (special?.id != null && !special.empty_draft) {
    return {
      id: special.id,
      student_id: input.workspace?.student?.id ?? 0,
      state: special.state,
      name: special.name ?? undefined,
      net_amount: special.net_amount ?? special.total_amount,
    };
  }

  return null;
}

function resolveAgreementUiStatus(input: {
  state: string | null | undefined;
  requiresReview: boolean;
  hasActiveAgreement: boolean;
}): FinanceAgreementUiStatus {
  if (input.requiresReview) return 'requires_review';
  const slug = normalizeReferenceValue(input.state ?? '');
  if (!slug || slug === 'none') return 'none';
  if (input.hasActiveAgreement && slug === 'active') return 'active';
  if (slug === 'active' && !input.hasActiveAgreement) return 'requires_review';
  if (slug === 'draft') return 'draft';
  if (slug === 'pending_approval') return 'pending_approval';
  if (slug === 'approved') return 'approved';
  if (slug === 'cancelled' || slug === 'terminated') return 'cancelled';
  if (INACTIVE_STATES.has(slug)) return 'requires_review';
  return 'none';
}

function readMoney(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return null;
}

function readCycleLabel(details?: StudentDetailsData | null): string | null {
  const enrollment = details?.current_enrollment;
  if (!enrollment) return null;
  const cycle =
    (enrollment as { cycle?: { name?: string | null }; academic_cycle?: { name?: string | null } })
      .cycle?.name ??
    (enrollment as { academic_cycle?: { name?: string | null } }).academic_cycle?.name ??
    null;
  return typeof cycle === 'string' && cycle.trim() ? cycle.trim() : null;
}

function normalizeCurrency(
  currency: FinanceFeePlanPresentation['currency'] | StudentFinancialOverview['totals']['currency'] | undefined,
): FinanceFeePlanPresentation['currency'] {
  if (!currency) return null;
  if ('id' in currency && typeof currency.id === 'number') {
    return currency;
  }
  return {
    id: 0,
    name: currency.name,
    symbol: currency.symbol,
  };
}

export function resolveFeePlanPresentation(input: {
  workspace?: StudentFinanceWorkspace | null;
  financialOverview?: StudentFinancialOverview | null;
  details?: StudentDetailsData | null;
}): FinanceFeePlanPresentation {
  const agreement = resolveDisplayedAgreement(input);
  const feePlanFromWorkspace = readFeePlanFromWorkspace(input.workspace);
  const feePlanFromAgreement = readFeePlanFromAgreement(agreement);
  const appliedPlan = input.financialOverview?.applied_plans?.[0] ?? null;
  const hasActiveAgreement = hasActiveFinancialAgreement({
    workspace: input.workspace,
    workspaceAgreement: input.workspace?.current_agreement ?? null,
    financialOverview: input.financialOverview,
  });
  const requiresReview = readRequiresFinanceReview(input.workspace);

  const agreementState = hasActiveAgreement
    ? (input.workspace?.current_agreement?.state ?? agreement?.state ?? null)
    : (agreement?.state ?? input.workspace?.inactive_agreement?.state ?? null);
  const agreementUiStatus = resolveAgreementUiStatus({
    state: agreementState,
    requiresReview,
    hasActiveAgreement,
  });

  const feePlanName =
    feePlanFromWorkspace.name ?? feePlanFromAgreement.name ?? appliedPlan?.name ?? null;
  const feePlanId = feePlanFromWorkspace.id ?? feePlanFromAgreement.id ?? appliedPlan?.id ?? null;
  const hasValidPlan = feePlanId != null || !!feePlanName?.trim();

  const grossAmount =
    readMoney(agreement?.gross_amount) ??
    readMoney(agreement?.original_total) ??
    readMoney(appliedPlan?.total_fees);
  const discountAmount =
    readMoney(agreement?.discount_amount) ?? readMoney(agreement?.discount_total);
  const netAmount =
    readMoney(agreement?.net_amount) ??
    readMoney(agreement?.net_total) ??
    readMoney(appliedPlan?.total_fees) ??
    readMoney(input.workspace?.summary?.total_agreed);
  const remainingAmount =
    readMoney(agreement?.remaining_total) ??
    readMoney(input.workspace?.summary?.remaining) ??
    readMoney(appliedPlan?.remaining);

  const academicYear =
    agreement?.academic_year?.name ??
    input.workspace?.academic_year?.name ??
    input.financialOverview?.academic_year?.name ??
    appliedPlan?.academic_year?.name ??
    null;

  return {
    hasValidPlan,
    feePlanName,
    feePlanId,
    academicYear,
    cycleLabel: readCycleLabel(input.details),
    levelLabel: input.details?.student?.level?.name ?? null,
    classLabel: input.details?.student?.class?.name ?? agreement?.enrollment?.class_name ?? null,
    agreementNumber: hasActiveAgreement
      ? readAgreementRef(input.workspace?.current_agreement ?? agreement)
      : readAgreementRef(agreement),
    agreementState,
    agreementUiStatus,
    validFrom: agreement?.valid_from ?? null,
    validUntil: agreement?.valid_until ?? null,
    grossAmount,
    discountAmount,
    netAmount,
    remainingAmount,
    currency: normalizeCurrency(
      agreement?.currency ??
        input.workspace?.summary?.currency ??
        input.financialOverview?.totals?.currency ??
        null,
    ),
    showAsInactive: !hasActiveAgreement || agreementUiStatus !== 'active',
    billingPartnerLabel: readBillingPartnerLabel(input.workspace),
  };
}

export function readRequiresFinanceReview(workspace?: StudentFinanceWorkspace | null): boolean {
  if (!workspace) return false;
  const raw = workspace as StudentFinanceWorkspace & {
    requires_finance_review?: boolean;
  };
  if (raw.requires_finance_review === false) return false;
  if (raw.requires_finance_review === true) return true;

  const hasActive = hasActiveFinancialAgreement({
    workspace,
    workspaceAgreement: workspace.current_agreement ?? null,
  });
  if (hasActive) {
    return workspace.agreement_repair?.required === true;
  }

  if (workspace.inactive_agreement?.requires_review === true) return true;
  if (workspace.agreement_repair?.required === true) return true;
  return false;
}
