import { academicYearFromSource } from '@/lib/utils/academic-years';
import type { AssignStudentFeePayload, FeePlan, FeePlanLine } from '@/types/finance';

/** Keep only plans tied to the selected academic year when year metadata is present. */
export function filterFeePlansForAcademicYear(
  plans: FeePlan[],
  academicYearId: number,
): FeePlan[] {
  return plans.filter((plan) => {
    const year = academicYearFromSource(plan);
    return year ? year.id === academicYearId : plan.academic_year_id === academicYearId;
  });
}

export function partitionFeePlanLines(lines: FeePlanLine[]): {
  required: FeePlanLine[];
  optional: FeePlanLine[];
} {
  const required: FeePlanLine[] = [];
  const optional: FeePlanLine[] = [];
  for (const line of lines) {
    if (line.is_optional === true) optional.push(line);
    else if (line.is_optional === false) required.push(line);
  }
  return { required, optional };
}

export function lineSubtotal(line: FeePlanLine): number {
  return line.subtotal ?? line.amount;
}

export function sumLineSubtotals(lines: FeePlanLine[]): number {
  return lines.reduce((sum, line) => sum + lineSubtotal(line), 0);
}

export function countInstallments(lines: FeePlanLine[]): number {
  return lines.reduce((sum, line) => {
    if (line.installment_schedule?.length) return sum + line.installment_schedule.length;
    return sum + (line.installment_count ?? 1);
  }, 0);
}

export interface InstallmentPreviewRow {
  sequence: number;
  due_date: string;
  amount: number;
  lineName: string;
}

/** Merge installment schedules from selected plan lines without inventing dates. */
export function buildInstallmentPreview(lines: FeePlanLine[]): InstallmentPreviewRow[] {
  const rows: InstallmentPreviewRow[] = [];
  for (const line of lines) {
    const lineName = line.name || line.fee_type?.name || line.fee_type_name || `#${line.id}`;
    if (line.installment_schedule?.length) {
      for (const inst of line.installment_schedule) {
        rows.push({
          sequence: inst.sequence,
          due_date: inst.due_date,
          amount: inst.amount,
          lineName,
        });
      }
    }
  }
  return rows.sort((a, b) => {
    const dateCmp = a.due_date.localeCompare(b.due_date);
    if (dateCmp !== 0) return dateCmp;
    return a.sequence - b.sequence;
  });
}

export function resolveDefaultEffectiveDate(options: {
  actualJoinDate?: string | null;
  enrollmentStartDate?: string | null;
  today?: string;
}): string {
  const pick = (value?: string | null) =>
    typeof value === 'string' && value.trim() ? value.trim().slice(0, 10) : null;
  return (
    pick(options.actualJoinDate) ??
    pick(options.enrollmentStartDate) ??
    options.today ??
    new Date().toISOString().slice(0, 10)
  );
}

export function isEffectiveDateOutsidePlan(
  effectiveDate: string,
  plan?: FeePlan | null,
): boolean {
  if (!plan || !effectiveDate) return false;
  const date = effectiveDate.slice(0, 10);
  if (plan.date_from && date < plan.date_from.slice(0, 10)) return true;
  if (plan.date_to && date > plan.date_to.slice(0, 10)) return true;
  return false;
}

export function buildAssignFeePlanPayload(
  feePlanId: number,
  effectiveDate: string,
  selectedOptionalLineIds: number[],
): AssignStudentFeePayload {
  return {
    fee_plan_id: feePlanId,
    effective_date: effectiveDate,
    selected_optional_line_ids: [...selectedOptionalLineIds],
  };
}

export function canSubmitFeePlanAssignment(options: {
  academicYearId: string;
  feePlanId: string;
  effectiveDate: string;
  plansLoading: boolean;
  plansError: boolean;
  submitting: boolean;
  planHasAssignableLines: boolean;
  planLinesContractError: boolean;
}): boolean {
  if (options.submitting || options.plansLoading || options.plansError) return false;
  if (options.planLinesContractError || !options.planHasAssignableLines) return false;
  if (!options.academicYearId || !options.feePlanId || !options.effectiveDate) return false;
  return Number(options.feePlanId) > 0;
}

export function planHasNoAssignableLines(plan?: FeePlan | null): boolean {
  if (!plan) return false;
  if (!plan.lines?.length) return true;
  const { required, optional } = partitionFeePlanLines(plan.lines);
  return required.length === 0 && optional.length === 0;
}

export function planLinesContractInvalid(plan?: FeePlan | null): boolean {
  if (!plan?.lines?.length) return false;
  return partitionFeePlanLines(plan.lines).required.length + partitionFeePlanLines(plan.lines).optional.length === 0;
}
