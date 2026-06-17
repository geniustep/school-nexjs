import type { FeePlanInstallmentScheduleItem } from '@/types/finance';

export type FeePlanScheduleMode = 'on_assignment' | 'fixed_date' | 'explicit';

export type FeePlanLineLevelScopeMode = 'all_plan_levels' | 'specific';

export interface DraftFeePlanLine {
  clientId: string;
  /** Odoo fee plan line id — required on PUT to update existing rows. */
  lineId?: number;
  feeTypeId: number;
  label: string;
  amount: number;
  frequency: string;
  levelScopeMode: FeePlanLineLevelScopeMode;
  levelIds: number[];
  isOptional: boolean;
  installmentCount: number;
  scheduleMode: FeePlanScheduleMode;
  dueDate: string;
  installmentSchedule: FeePlanInstallmentScheduleItem[];
}

export interface FeePlanFormValues {
  name: string;
  code: string;
  notes: string;
  academicYearId: string;
  levelIds: number[];
  lines: DraftFeePlanLine[];
}

export interface FeePlanSummaryTotals {
  lineCount: number;
  requiredCount: number;
  optionalCount: number;
  requiredTotal: number;
  optionalTotal: number;
  oneTimeTotal: number;
  monthlyUnitTotal: number;
  maxInstallmentCount: number;
  expectedTotal: number | null;
  grandTotal: number;
  currency: string | null;
}

export type FeePlanDrawerMode = 'create' | 'edit' | 'view';

export function createEmptyFeePlanFormValues(): FeePlanFormValues {
  return {
    name: '',
    code: '',
    notes: '',
    academicYearId: '',
    levelIds: [],
    lines: [],
  };
}

export function newDraftLine(clientId: string): DraftFeePlanLine {
  return {
    clientId,
    feeTypeId: 0,
    label: '',
    amount: 0,
    frequency: 'once',
    levelScopeMode: 'all_plan_levels',
    levelIds: [],
    isOptional: false,
    installmentCount: 1,
    scheduleMode: 'on_assignment',
    dueDate: '',
    installmentSchedule: [],
  };
}
