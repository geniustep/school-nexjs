import type { TeachingAssignmentCandidatesResponse } from '@/types/teacher-domain';

export type AssignmentBackendContract = 'v1' | 'legacy_1c' | 'unknown';
export type AssignmentPeriodMode = 'academic_year' | 'custom';
type PeriodPayload =
  | { period_mode: 'academic_year' }
  | { period_mode: 'custom'; effective_from: string; effective_to: string }
  | { effective_from: string; effective_to: string };
const owns = (r: Record<string, unknown>, k: string) => Object.prototype.hasOwnProperty.call(r, k);

export function detectAssignmentBackendContract(
  response: Pick<TeachingAssignmentCandidatesResponse, 'context'>,
): AssignmentBackendContract {
  const context = response.context;
  if (!context || typeof context !== 'object' || Array.isArray(context)) return 'unknown';
  const r = context as Record<string, unknown>;
  const hasMode = owns(r, 'period_mode');
  const hasWindow = owns(r, 'period_window');
  if (hasMode && hasWindow && r.period_window && typeof r.period_window === 'object') return 'v1';
  if (hasMode || hasWindow) return 'unknown';
  if (owns(r, 'academic_year_id') && owns(r, 'effective_from') &&
      owns(r, 'effective_to') && owns(r, 'time_window')) return 'legacy_1c';
  return 'unknown';
}

export function buildAssignmentPeriodPayload(input: {
  contract: AssignmentBackendContract;
  acceptedLegacy: boolean;
  mode: AssignmentPeriodMode;
  effectiveFrom: string;
  effectiveTo: string;
}): PeriodPayload | null {
  if (input.contract === 'v1') {
    if (input.mode === 'academic_year') return { period_mode: 'academic_year' };
    if (!validDates(input.effectiveFrom, input.effectiveTo)) return null;
    return { period_mode: 'custom', effective_from: input.effectiveFrom,
      effective_to: input.effectiveTo };
  }
  if (input.contract === 'legacy_1c' && input.acceptedLegacy &&
      validDates(input.effectiveFrom, input.effectiveTo)) {
    return { effective_from: input.effectiveFrom, effective_to: input.effectiveTo };
  }
  return null;
}
function validDates(from: string, to: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(from) &&
    /^\d{4}-\d{2}-\d{2}$/.test(to) && from <= to;
}
