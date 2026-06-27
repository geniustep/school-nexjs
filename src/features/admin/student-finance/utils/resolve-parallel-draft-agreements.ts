import type { FinancialAgreement, StudentFinanceWorkspace } from '../types';

export type ParallelDraftAgreementRef = Pick<FinancialAgreement, 'id' | 'number' | 'name' | 'state'>;

export type ParallelDraftAgreementsPresentation = {
  showBanner: boolean;
  drafts: ParallelDraftAgreementRef[];
  count: number;
  primaryDraftId: number | null;
  primaryDraftHref: string | null;
  financeHubListHref: string;
};

function isActiveCurrentAgreement(workspace?: StudentFinanceWorkspace | null): boolean {
  if (workspace?.billing_context?.has_active_agreement === true) return true;
  return workspace?.current_agreement?.state === 'active';
}

/** Draft agreements in agreements_summary that are not the active current_agreement. */
export function resolveParallelDraftAgreementsPresentation(input: {
  workspace?: StudentFinanceWorkspace | null;
  studentId: number;
}): ParallelDraftAgreementsPresentation {
  const workspace = input.workspace;
  const financeHubListHref = `/admin/finance/agreements?student_id=${input.studentId}`;
  const empty: ParallelDraftAgreementsPresentation = {
    showBanner: false,
    drafts: [],
    count: 0,
    primaryDraftId: null,
    primaryDraftHref: null,
    financeHubListHref,
  };

  const currentId = workspace?.current_agreement?.id;
  if (!isActiveCurrentAgreement(workspace) || currentId == null) {
    return empty;
  }

  const inactiveId = workspace?.inactive_agreement?.id ?? null;
  const drafts = (workspace?.agreements_summary ?? [])
    .filter((item): item is FinancialAgreement & { id: number } => {
      if (item.id == null || item.state !== 'draft') return false;
      if (item.id === currentId) return false;
      if (inactiveId != null && item.id === inactiveId) return false;
      return true;
    })
    .map((item) => ({
      id: item.id,
      number: item.number ?? undefined,
      name: item.name ?? undefined,
      state: item.state ?? 'draft',
    }))
    .sort((a, b) => b.id - a.id);

  if (drafts.length === 0) return empty;

  const primaryDraftId = drafts[0].id;
  return {
    showBanner: true,
    drafts,
    count: drafts.length,
    primaryDraftId,
    primaryDraftHref: `/admin/finance/agreements/${primaryDraftId}`,
    financeHubListHref,
  };
}
