import { hasAgreementData } from './reference-labels';

export type FinanceTabLoadPhase = 'years' | 'workspace' | 'agreement-detail' | 'ready';

export function resolveFinanceTabLoadPhase(input: {
  yearsLoading: boolean;
  effectiveYearId: string;
  workspaceInitialLoading: boolean;
  agreementId: number | null;
  agreementDetailInitialLoading: boolean;
}): FinanceTabLoadPhase {
  if (input.yearsLoading || !input.effectiveYearId) return 'years';
  if (input.workspaceInitialLoading) return 'workspace';
  if (input.agreementId && input.agreementDetailInitialLoading) return 'agreement-detail';
  return 'ready';
}

export function shouldShowAgreementEmptyState(input: {
  phase: FinanceTabLoadPhase;
  agreement: { id?: number } | null | undefined;
  workspaceLoaded: boolean;
}): boolean {
  if (input.phase !== 'ready') return false;
  if (!input.workspaceLoaded) return false;
  return !hasAgreementData(input.agreement);
}

export function shouldShowFinanceEmptyState(input: {
  phase: FinanceTabLoadPhase;
  workspaceLoaded: boolean;
  emptyFinance: boolean;
}): boolean {
  if (input.phase !== 'ready') return false;
  if (!input.workspaceLoaded) return false;
  return input.emptyFinance;
}

export function shouldShowFinanceInitialSkeleton(input: {
  phase: FinanceTabLoadPhase;
}): boolean {
  return input.phase !== 'ready';
}
