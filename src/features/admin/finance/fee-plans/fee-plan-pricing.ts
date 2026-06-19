import { feePlanFrequencyFromApi } from './fee-plan-frequency';
import { roundMoney } from './fee-plan-payload';
import type { DraftFeePlanLine } from './fee-plan-types';
import type { FeePlanLine, StudentFee } from '@/types/finance';

export type FeePlanPricingMode = 'recurring_unit_price' | 'total_amount_installments';

export interface FeePlanLineExpectedTotal {
  pricingMode: FeePlanPricingMode | null;
  unitAmount: number;
  installmentAmount: number | null;
  expectedTotal: number;
  installmentCount: number;
  quantity: number;
}

export interface BillingProfileAssignmentSummary {
  id?: number;
  created_automatically?: boolean;
  billing_partner_id?: number;
  billing_party_type?: 'guardian' | 'student' | 'custom' | string;
}

export interface PlanFinancialSummaryBreakdown {
  oneTimeTotal: number;
  recurringUnitTotal: number;
  recurringPeriodCount: number | null;
  expectedTotal: number;
  lineCount: number;
}

export function normalizePricingMode(raw: unknown): FeePlanPricingMode | null {
  if (raw === 'recurring_unit_price' || raw === 'total_amount_installments') return raw;
  return null;
}

export function inferDefaultPricingMode(frequencyUi: string): FeePlanPricingMode {
  if (frequencyUi === 'once' || frequencyUi === 'one_time') return 'total_amount_installments';
  if (frequencyUi === 'monthly' || frequencyUi === 'term') return 'recurring_unit_price';
  return 'total_amount_installments';
}

function lineFrequencyUi(line: FeePlanLine): string {
  return feePlanFrequencyFromApi(line.frequency);
}

function installmentCountFromLine(line: FeePlanLine): number {
  return line.installment_count ?? line.installment_schedule?.length ?? 1;
}

function installmentCountFromDraft(line: DraftFeePlanLine): number {
  return line.installmentCount > 0 ? line.installmentCount : 1;
}

/** Legacy display fallback — does not reinterpret pricing_mode when absent. */
function legacyExpectedTotal(line: FeePlanLine, freqUi: string, count: number): number {
  const amount = Number(line.amount);
  const subtotal = line.subtotal ?? amount;

  if (freqUi === 'once' || freqUi === 'one_time') {
    return subtotal;
  }
  if (subtotal > amount && count > 1) return subtotal;
  if (count > 1) return roundMoney(amount * count);
  return subtotal;
}

function legacyInstallmentAmount(expectedTotal: number, count: number): number | null {
  if (count <= 1) return expectedTotal;
  return roundMoney(expectedTotal / count);
}

export function resolveLinePricing(line: FeePlanLine): FeePlanLineExpectedTotal {
  const freqUi = lineFrequencyUi(line);
  const count = installmentCountFromLine(line);
  const qty = line.quantity && line.quantity > 0 ? line.quantity : 1;
  const amount = Number(line.amount);
  const mode = normalizePricingMode(line.pricing_mode);

  if (line.expected_total != null && Number.isFinite(line.expected_total)) {
    const expectedTotal = line.expected_total;
    const installmentAmount =
      line.installment_amount != null && Number.isFinite(line.installment_amount)
        ? line.installment_amount
        : count > 1
          ? roundMoney(expectedTotal / count)
          : expectedTotal;
    return {
      pricingMode: mode,
      unitAmount: amount,
      installmentAmount,
      expectedTotal,
      installmentCount: count,
      quantity: qty,
    };
  }

  if (mode === 'recurring_unit_price') {
    const expectedTotal = roundMoney(amount * qty * count);
    return {
      pricingMode: mode,
      unitAmount: amount,
      installmentAmount: line.installment_amount ?? amount,
      expectedTotal,
      installmentCount: count,
      quantity: qty,
    };
  }

  if (mode === 'total_amount_installments') {
    const expectedTotal = roundMoney(amount * qty);
    return {
      pricingMode: mode,
      unitAmount: amount,
      installmentAmount:
        line.installment_amount ??
        (count > 1 ? roundMoney(expectedTotal / count) : expectedTotal),
      expectedTotal,
      installmentCount: count,
      quantity: qty,
    };
  }

  const expectedTotal = legacyExpectedTotal(line, freqUi, count);
  return {
    pricingMode: null,
    unitAmount: amount,
    installmentAmount: legacyInstallmentAmount(expectedTotal, count),
    expectedTotal,
    installmentCount: count,
    quantity: qty,
  };
}

export function resolveLineExpectedTotal(line: FeePlanLine): number {
  return resolveLinePricing(line).expectedTotal;
}

export function resolveDraftLinePricing(line: DraftFeePlanLine): FeePlanLineExpectedTotal {
  const mode = line.pricingMode ?? inferDefaultPricingMode(line.frequency);
  const count = installmentCountFromDraft(line);
  const qty = 1;
  const amount = Number(line.amount) || 0;

  if (mode === 'recurring_unit_price') {
    const expectedTotal = roundMoney(amount * qty * count);
    return {
      pricingMode: mode,
      unitAmount: amount,
      installmentAmount: amount,
      expectedTotal,
      installmentCount: count,
      quantity: qty,
    };
  }

  const expectedTotal = roundMoney(amount * qty);
  return {
    pricingMode: mode,
    unitAmount: amount,
    installmentAmount: count > 1 ? roundMoney(expectedTotal / count) : expectedTotal,
    expectedTotal,
    installmentCount: count,
    quantity: qty,
  };
}

export function computeDraftLineExpectedTotal(line: DraftFeePlanLine): number {
  return resolveDraftLinePricing(line).expectedTotal;
}

export function computeDraftInstallmentAmount(line: DraftFeePlanLine): number | null {
  return resolveDraftLinePricing(line).installmentAmount;
}

export function validateDraftLinePricing(line: DraftFeePlanLine): string | null {
  const freq = line.frequency;
  const mode = line.pricingMode ?? inferDefaultPricingMode(freq);
  const count = installmentCountFromDraft(line);

  if ((freq === 'once' || freq === 'one_time') && mode === 'recurring_unit_price' && count > 1) {
    return 'admin.finance.feePlansWorkspace.errors.pricingInconsistent';
  }
  return null;
}

export function lineHasPricingInconsistency(line: FeePlanLine): boolean {
  const freq = lineFrequencyUi(line);
  const mode = normalizePricingMode(line.pricing_mode);
  const count = installmentCountFromLine(line);
  if ((freq === 'once' || freq === 'one_time') && mode === 'recurring_unit_price' && count > 1) {
    return true;
  }
  return lineHasFrequencyInstallmentConflict(line);
}

export function lineHasFrequencyInstallmentConflict(line: FeePlanLine): boolean {
  const freq = lineFrequencyUi(line);
  const count = installmentCountFromLine(line);
  return (freq === 'once' || freq === 'one_time') && count > 1;
}

export function resolvePricingModeForDisplay(
  line: FeePlanLine,
  pricing: FeePlanLineExpectedTotal,
): FeePlanPricingMode | null {
  if (pricing.pricingMode) return pricing.pricingMode;
  const freq = lineFrequencyUi(line);
  if (freq === 'once' || freq === 'one_time') return 'total_amount_installments';
  return null;
}

export function sumPlanExpectedTotal(lines: FeePlanLine[]): number {
  return roundMoney(lines.reduce((sum, line) => sum + resolveLineExpectedTotal(line), 0));
}

function isOneTimeFrequency(frequency: string): boolean {
  return frequency === 'once' || frequency === 'one_time';
}

export function isLegacyRecurringDisplay(line: FeePlanLine, pricing: FeePlanLineExpectedTotal, freq: string): boolean {
  if (pricing.pricingMode === 'recurring_unit_price') return true;
  if (pricing.pricingMode === 'total_amount_installments') return false;
  if (freq !== 'monthly' && freq !== 'term') return false;
  if (pricing.installmentCount <= 1) return false;
  return roundMoney(pricing.unitAmount * pricing.installmentCount) === pricing.expectedTotal;
}

export function computePlanFinancialBreakdown(lines: FeePlanLine[]): PlanFinancialSummaryBreakdown {
  let oneTimeTotal = 0;
  let recurringUnitTotal = 0;
  let recurringPeriodCount: number | null = null;
  let expectedTotal = 0;

  for (const line of lines) {
    const pricing = resolveLinePricing(line);
    expectedTotal += pricing.expectedTotal;
    const freq = lineFrequencyUi(line);
    const mode = pricing.pricingMode ?? (isOneTimeFrequency(freq) ? 'total_amount_installments' : null);
    const recurringDisplay = isLegacyRecurringDisplay(line, pricing, freq);

    if (recurringDisplay) {
      if (!line.is_optional) recurringUnitTotal += pricing.unitAmount;
      if (pricing.installmentCount > 1) {
        recurringPeriodCount =
          recurringPeriodCount == null
            ? pricing.installmentCount
            : Math.max(recurringPeriodCount, pricing.installmentCount);
      }
    } else if (!line.is_optional) {
      oneTimeTotal += pricing.expectedTotal;
    }
  }

  return {
    oneTimeTotal: roundMoney(oneTimeTotal),
    recurringUnitTotal: roundMoney(recurringUnitTotal),
    recurringPeriodCount,
    expectedTotal: roundMoney(expectedTotal),
    lineCount: lines.length,
  };
}

export function computeDraftPlanFinancialBreakdown(
  lines: DraftFeePlanLine[],
): PlanFinancialSummaryBreakdown {
  let oneTimeTotal = 0;
  let recurringUnitTotal = 0;
  let recurringPeriodCount: number | null = null;
  let expectedTotal = 0;

  for (const line of lines) {
    if (!line.amount || line.amount <= 0) continue;
    const pricing = resolveDraftLinePricing(line);
    expectedTotal += pricing.expectedTotal;
    const mode = line.pricingMode ?? inferDefaultPricingMode(line.frequency);

    if (mode === 'recurring_unit_price' && (line.frequency === 'monthly' || line.frequency === 'term')) {
      if (!line.isOptional) recurringUnitTotal += pricing.unitAmount;
      if (pricing.installmentCount > 1) {
        recurringPeriodCount =
          recurringPeriodCount == null
            ? pricing.installmentCount
            : Math.max(recurringPeriodCount, pricing.installmentCount);
      }
    } else if (!line.isOptional) {
      oneTimeTotal += pricing.expectedTotal;
    }
  }

  return {
    oneTimeTotal: roundMoney(oneTimeTotal),
    recurringUnitTotal: roundMoney(recurringUnitTotal),
    recurringPeriodCount,
    expectedTotal: roundMoney(expectedTotal),
    lineCount: lines.length,
  };
}

export function billingPartyTypeLabelKey(type: string | undefined): string {
  switch (type) {
    case 'guardian':
      return 'admin.finance.billingPartyType.guardian';
    case 'student':
      return 'admin.finance.billingPartyType.student';
    case 'custom':
      return 'admin.finance.billingPartyType.custom';
    default:
      return 'admin.finance.billingPartyType.custom';
  }
}

export function countAssignedInstallments(fees: Pick<StudentFee, 'installments'>[]): number {
  return fees.reduce(
    (sum, fee) => sum + (Array.isArray(fee.installments) ? fee.installments.length : 0),
    0,
  );
}

export function sumAssignedFeeTotals(
  fees: Pick<StudentFee, 'original_amount' | 'net_amount' | 'amount'>[],
): number {
  return roundMoney(
    fees.reduce((sum, fee) => {
      const value = fee.original_amount ?? fee.net_amount ?? fee.amount ?? 0;
      return sum + (Number.isFinite(value) ? value : 0);
    }, 0),
  );
}

export function draftAmountFieldLabelKey(line: DraftFeePlanLine): string {
  const mode = line.pricingMode ?? inferDefaultPricingMode(line.frequency);
  if (mode === 'recurring_unit_price') {
    if (line.frequency === 'term') return 'admin.finance.feePlansWorkspace.pricing.termUnitPrice';
    if (line.frequency === 'monthly') return 'admin.finance.feePlansWorkspace.pricing.monthlyUnitPrice';
    return 'admin.finance.feePlansWorkspace.pricing.unitCyclePrice';
  }
  return 'admin.finance.feePlansWorkspace.pricing.totalAmount';
}

export function draftAmountHintKey(line: DraftFeePlanLine): string {
  const mode = line.pricingMode ?? inferDefaultPricingMode(line.frequency);
  return mode === 'recurring_unit_price'
    ? 'admin.finance.feePlansWorkspace.pricing.recurringHint'
    : 'admin.finance.feePlansWorkspace.pricing.installmentTotalHint';
}

export function pricingModeLabelKey(mode: FeePlanPricingMode | null): string {
  return pricingModeDisplayKey({ pricingMode: mode });
}

export function pricingModeDisplayKey(input: {
  frequency?: string | null;
  pricingMode?: FeePlanPricingMode | null;
}): string {
  const freq = input.frequency ?? '';
  if (freq === 'once' || freq === 'one_time') {
    return 'admin.finance.feePlansWorkspace.pricing.oneTimeBadge';
  }
  if (input.pricingMode === 'recurring_unit_price') {
    return 'admin.finance.feePlansWorkspace.pricing.monthlyRecurringBadge';
  }
  if (input.pricingMode === 'total_amount_installments') {
    return 'admin.finance.feePlansWorkspace.pricing.installmentTotalBadge';
  }
  return 'admin.finance.feePlansWorkspace.pricing.legacyBadge';
}

export function unitAmountColumnLabelKey(
  pricingMode: FeePlanPricingMode | null,
  frequency: string,
): string {
  if (frequency === 'once' || frequency === 'one_time') {
    return 'admin.finance.feePlansWorkspace.pricing.oneTimeAmount';
  }
  if (pricingMode === 'recurring_unit_price') {
    return 'admin.finance.feePlansWorkspace.pricing.monthlyUnitPrice';
  }
  if (pricingMode === 'total_amount_installments') {
    return 'admin.finance.feePlansWorkspace.pricing.totalAmount';
  }
  return 'admin.finance.feePlansWorkspace.pricing.unitOrTotalColumn';
}
