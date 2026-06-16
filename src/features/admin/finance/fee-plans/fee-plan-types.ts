import type { FeePlanInstallmentScheduleItem } from '@/types/finance';

export type FeePlanScheduleMode = 'on_assignment' | 'fixed_date' | 'explicit';

export interface DraftFeePlanLine {
  clientId: string;
  feeTypeId: number;
  label: string;
  amount: number;
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
    isOptional: false,
    installmentCount: 1,
    scheduleMode: 'on_assignment',
    dueDate: '',
    installmentSchedule: [],
  };
}
