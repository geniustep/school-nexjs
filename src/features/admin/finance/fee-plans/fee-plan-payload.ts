import { isPositiveAmount } from '@/lib/utils/finance';
import type { CreateFeePlanPayload, FeePlanLineInput, UpdateFeePlanPayload } from '@/types/finance';
import type { DraftFeePlanLine, FeePlanFormValues } from './fee-plan-types';

export interface FeePlanValidationError {
  field?: 'name' | 'code' | 'academicYearId' | 'levelId' | 'lines';
  lineClientId?: string;
  lineField?: 'feeTypeId' | 'amount' | 'installments';
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

export function buildLinePayload(line: DraftFeePlanLine): FeePlanLineInput {
  const payload: FeePlanLineInput = {
    fee_type_id: line.feeTypeId,
    amount: line.amount,
    is_optional: line.isOptional,
    description: line.label.trim() || undefined,
  };

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
    const levelId = Number(values.levelId);
    if (!Number.isFinite(levelId) || levelId <= 0) {
      return {
        field: 'levelId',
        messageKey: 'admin.finance.feePlansWorkspace.errors.levelRequired',
      };
    }
  }
  if (!values.lines.length) {
    return { field: 'lines', messageKey: 'admin.finance.feePlansWorkspace.errors.linesRequired' };
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
    if (line.scheduleMode === 'explicit' && line.installmentCount > 1) {
      if (!line.installmentSchedule.length) {
        return {
          field: 'lines',
          lineClientId: line.clientId,
          lineField: 'installments',
          messageKey: 'admin.finance.feePlansWorkspace.errors.scheduleRequired',
        };
      }
      const total = roundMoney(installmentScheduleTotal(line.installmentSchedule));
      if (total !== roundMoney(line.amount)) {
        return {
          field: 'lines',
          lineClientId: line.clientId,
          lineField: 'installments',
          messageKey: 'admin.finance.feePlansWorkspace.errors.scheduleMismatch',
        };
      }
    }
  }

  return null;
}

export function buildCreateFeePlanPayload(
  values: FeePlanFormValues,
  schoolId: number,
): CreateFeePlanPayload {
  const levelId = Number(values.levelId);
  return {
    school_id: schoolId,
    name: values.name.trim(),
    code: values.code.trim(),
    academic_year_id: Number(values.academicYearId),
    level_id: Number.isFinite(levelId) && levelId > 0 ? levelId : undefined,
    notes: values.notes.trim() || undefined,
    lines: values.lines.map(buildLinePayload),
  };
}

export function buildUpdateFeePlanPayload(values: FeePlanFormValues): UpdateFeePlanPayload {
  const levelId = Number(values.levelId);
  return {
    name: values.name.trim(),
    code: values.code.trim(),
    level_id: Number.isFinite(levelId) && levelId > 0 ? levelId : null,
    notes: values.notes.trim() || undefined,
    lines: values.lines.map(buildLinePayload),
  };
}
