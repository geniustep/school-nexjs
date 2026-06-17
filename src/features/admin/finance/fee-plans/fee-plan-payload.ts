import { isPositiveAmount } from '@/lib/utils/finance';
import type { CreateFeePlanPayload, FeePlanLineInput, UpdateFeePlanPayload } from '@/types/finance';
import { inferDefaultPricingMode, validateDraftLinePricing } from './fee-plan-pricing';
import type { DraftFeePlanLine, FeePlanFormValues } from './fee-plan-types';
import { sortLevelIdsByGroups, dedupeLevelIds, type FeePlanScopeCycleGroup } from './fee-plan-level-scope';
import { feePlanFrequencyToApi } from './fee-plan-frequency';

function resolveLevelIdsForPayload(
  levelIds: number[],
  scopeGroups: FeePlanScopeCycleGroup[],
): number[] {
  if (!scopeGroups.length) return dedupeLevelIds(levelIds);
  return sortLevelIdsByGroups(levelIds, scopeGroups);
}

export interface FeePlanValidationError {
  field?: 'name' | 'code' | 'academicYearId' | 'levelIds' | 'lines';
  lineClientId?: string;
  lineField?: 'feeTypeId' | 'amount' | 'installments' | 'levelIds';
  messageKey: string;
}

export function installmentScheduleTotal(
  schedule: { amount: number }[],
): number {
  return schedule.reduce((sum, row) => sum + row.amount, 0);
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Suggest equal split; last installment absorbs rounding remainder. */
export function suggestEqualInstallments(
  amount: number,
  count: number,
  startDate?: string,
): { sequence: number; due_date: string; amount: number }[] {
  if (count <= 0 || !isPositiveAmount(amount)) return [];
  const base = roundMoney(amount / count);
  const rows: { sequence: number; due_date: string; amount: number }[] = [];
  let allocated = 0;
  const anchor = startDate?.trim() || new Date().toISOString().slice(0, 10);
  for (let i = 1; i <= count; i++) {
    const isLast = i === count;
    const rowAmount = isLast ? roundMoney(amount - allocated) : base;
    allocated = roundMoney(allocated + rowAmount);
    rows.push({ sequence: i, due_date: anchor, amount: rowAmount });
  }
  return rows;
}

export function lineScopeSignature(line: DraftFeePlanLine): string {
  const levels =
    line.levelScopeMode === 'all_plan_levels'
      ? 'ALL'
      : [...line.levelIds].sort((a, b) => a - b).join(',');
  return `${line.feeTypeId}:${levels}`;
}

export function findDuplicateLineScope(lines: DraftFeePlanLine[]): DraftFeePlanLine | null {
  const seen = new Set<string>();
  for (const line of lines) {
    if (!line.feeTypeId) continue;
    const key = lineScopeSignature(line);
    if (seen.has(key)) return line;
    seen.add(key);
  }
  return null;
}

export function buildLinePayload(line: DraftFeePlanLine): FeePlanLineInput {
  const pricingMode = line.pricingMode ?? inferDefaultPricingMode(line.frequency);
  const payload: FeePlanLineInput = {
    fee_type_id: line.feeTypeId,
    amount: line.amount,
    pricing_mode: pricingMode,
    is_optional: line.isOptional,
    description: line.label.trim() || undefined,
  };

  if (line.lineId != null && line.lineId > 0) {
    payload.id = line.lineId;
  }

  if (line.frequency.trim()) {
    payload.frequency = feePlanFrequencyToApi(line.frequency);
  }

  if (line.levelScopeMode === 'specific' && line.levelIds.length > 0) {
    payload.level_ids = dedupeLevelIds(line.levelIds);
  } else if (line.levelScopeMode === 'all_plan_levels') {
    payload.level_ids = [];
  }

  if (line.installmentCount <= 1) {
    payload.installment_count = 1;
    if (line.dueDate.trim()) payload.due_date = line.dueDate.trim();
    return payload;
  }

  if (line.scheduleMode === 'explicit' && line.installmentSchedule.length > 0) {
    payload.installment_count = line.installmentSchedule.length;
    payload.installment_schedule = line.installmentSchedule.map((row) => ({
      sequence: row.sequence,
      due_date: row.due_date,
      amount: row.amount,
    }));
    return payload;
  }

  payload.installment_count = line.installmentCount;
  if (line.scheduleMode === 'on_assignment') {
    payload.due_rule = 'on_assignment';
  } else if (line.scheduleMode === 'fixed_date' && line.dueDate.trim()) {
    payload.due_date = line.dueDate.trim();
  }
  return payload;
}

export function validateFeePlanForm(
  values: FeePlanFormValues,
  options?: { requireLevel?: boolean },
): FeePlanValidationError | null {
  if (!values.name.trim()) {
    return { field: 'name', messageKey: 'admin.finance.feePlansWorkspace.errors.nameRequired' };
  }
  if (!values.code.trim()) {
    return { field: 'code', messageKey: 'admin.finance.feePlansWorkspace.errors.codeRequired' };
  }
  const yearId = Number(values.academicYearId);
  if (!Number.isFinite(yearId) || yearId <= 0) {
    return {
      field: 'academicYearId',
      messageKey: 'admin.finance.feePlansWorkspace.errors.yearRequired',
    };
  }
  if (options?.requireLevel) {
    if (!values.levelIds.length) {
      return {
        field: 'levelIds',
        messageKey: 'admin.finance.feePlansWorkspace.errors.levelRequired',
      };
    }
  }
  if (!values.lines.length) {
    return { field: 'lines', messageKey: 'admin.finance.feePlansWorkspace.errors.linesRequired' };
  }

  const duplicate = findDuplicateLineScope(values.lines);
  if (duplicate) {
    return {
      field: 'lines',
      lineClientId: duplicate.clientId,
      messageKey: 'admin.finance.feePlansWorkspace.errors.duplicateLineScope',
    };
  }

  for (const line of values.lines) {
    if (!line.feeTypeId) {
      return {
        field: 'lines',
        lineClientId: line.clientId,
        lineField: 'feeTypeId',
        messageKey: 'admin.finance.feePlansWorkspace.errors.lineFeeTypeRequired',
      };
    }
    if (!isPositiveAmount(line.amount)) {
      return {
        field: 'lines',
        lineClientId: line.clientId,
        lineField: 'amount',
        messageKey: 'admin.finance.feePlansWorkspace.errors.lineAmountRequired',
      };
    }
    if (line.levelScopeMode === 'specific' && !line.levelIds.length) {
      return {
        field: 'lines',
        lineClientId: line.clientId,
        lineField: 'levelIds',
        messageKey: 'admin.finance.feePlansWorkspace.errors.lineLevelRequired',
      };
    }
    if (line.scheduleMode === 'explicit' && line.installmentCount > 1) {
      if (!line.installmentSchedule.length) {
        return {
          field: 'lines',
          lineClientId: line.clientId,
          lineField: 'installments',
          messageKey: 'admin.finance.feePlansWorkspace.errors.scheduleRequired',
        };
      }
      const expectedTotal =
        (line.pricingMode ?? inferDefaultPricingMode(line.frequency)) === 'total_amount_installments'
          ? roundMoney(line.amount)
          : roundMoney(line.amount * line.installmentCount);
      const total = roundMoney(installmentScheduleTotal(line.installmentSchedule));
      if (total !== expectedTotal) {
        return {
          field: 'lines',
          lineClientId: line.clientId,
          lineField: 'installments',
          messageKey: 'admin.finance.feePlansWorkspace.errors.scheduleMismatch',
        };
      }
    }
    const pricingError = validateDraftLinePricing(line);
    if (pricingError) {
      return {
        field: 'lines',
        lineClientId: line.clientId,
        messageKey: pricingError,
      };
    }
  }

  return null;
}

export type FeePlanLevelScopeWritePayload = {
  level_ids: number[];
};

export function buildCreateFeePlanPayload(
  values: FeePlanFormValues,
  schoolId: number,
  scopeGroups: FeePlanScopeCycleGroup[] = [],
): CreateFeePlanPayload & FeePlanLevelScopeWritePayload {
  return {
    school_id: schoolId,
    name: values.name.trim(),
    code: values.code.trim(),
    academic_year_id: Number(values.academicYearId),
    level_ids: resolveLevelIdsForPayload(values.levelIds, scopeGroups),
    notes: values.notes.trim() || undefined,
    lines: values.lines.map(buildLinePayload),
  };
}

export function buildUpdateFeePlanPayload(
  values: FeePlanFormValues,
  scopeGroups: FeePlanScopeCycleGroup[] = [],
): UpdateFeePlanPayload & FeePlanLevelScopeWritePayload {
  return {
    name: values.name.trim(),
    code: values.code.trim(),
    level_ids: resolveLevelIdsForPayload(values.levelIds, scopeGroups),
    notes: values.notes.trim() || undefined,
    lines: values.lines.map(buildLinePayload),
  };
}
