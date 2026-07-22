import type { AssignPlanPreviewState } from '@/types/student-finance-assign-plan';
import type { StudentCreateFinanceFormState } from '@/types/student-enrollment-finance';
import { defaultStudentCreateFinanceFormState } from './student-enrollment-finance';
import type { FamilyChildSubmitResult } from './family-registration-state';

export type FamilyRegistrationFinanceWizardStep = 'finance' | 'finance_result';

export type FamilyChildFinanceSubmitStatus =
  | 'pending'
  | 'queued'
  | 'submitting'
  | 'succeeded'
  | 'already_active'
  | 'failed'
  | 'ambiguous'
  | 'skipped'
  | 'blocked';

export interface FamilyChildFinanceDraft {
  localId: string;
  studentId: number;
  displayName: string;
  academicYearId: number | null;
  levelId: string;
  /** When false, this child is temporarily excluded from plan creation. */
  included: boolean;
  billingResponsibleLabel: string;
  previewLoading: boolean;
  preview: AssignPlanPreviewState | null;
  financeState: StudentCreateFinanceFormState | null;
  /** True after the user edits fields that should not be overwritten by shared apply. */
  hasLocalCustomization: boolean;
  previewErrorMessage?: string;
}

export interface FamilyChildFinanceSubmitResult {
  localId: string;
  studentId: number;
  displayName: string;
  status: FamilyChildFinanceSubmitStatus;
  agreementId?: number;
  feePlanId?: number;
  errorMessage?: string;
  errorCode?: string;
  /** True only when a clear API error response was received (not network ambiguity). */
  canRetrySafely: boolean;
}

export interface FamilyFinanceSubmitState {
  phase: 'idle' | 'submitting' | 'completed';
  results: FamilyChildFinanceSubmitResult[];
  /** Prevents accidental full re-submit after any successful assign. */
  lockedAgainstFullResubmit: boolean;
}

export type SharedFinanceApplySkipReason =
  | 'no_preview'
  | 'excluded'
  | 'already_active'
  | 'incompatible_plan'
  | 'has_local_customization';

export interface SharedFinanceApplyOutcome {
  drafts: FamilyChildFinanceDraft[];
  appliedLocalIds: string[];
  skipped: Array<{ localId: string; reason: SharedFinanceApplySkipReason }>;
}

export function emptyFamilyFinanceSubmitState(): FamilyFinanceSubmitState {
  return {
    phase: 'idle',
    results: [],
    lockedAgainstFullResubmit: false,
  };
}

export function buildFamilyFinanceDraftsFromRegistration(input: {
  results: FamilyChildSubmitResult[];
  childrenByLocalId: Map<
    string,
    { academicYearId: string; levelId: string; displayName?: string }
  >;
  billingResponsibleLabel: string;
}): FamilyChildFinanceDraft[] {
  return input.results
    .filter((result) => result.status === 'succeeded' && typeof result.studentId === 'number')
    .map((result) => {
      const child = input.childrenByLocalId.get(result.localId);
      const academicYearRaw = child?.academicYearId?.trim() ?? '';
      const academicYearId =
        academicYearRaw && Number.isFinite(Number(academicYearRaw))
          ? Number(academicYearRaw)
          : null;
      return {
        localId: result.localId,
        studentId: result.studentId as number,
        displayName: result.displayName || child?.displayName || '—',
        academicYearId,
        levelId: child?.levelId?.trim() ?? '',
        included: true,
        billingResponsibleLabel: input.billingResponsibleLabel,
        previewLoading: false,
        preview: null,
        financeState: null,
        hasLocalCustomization: false,
      };
    });
}

export function patchFamilyFinanceDraft(
  drafts: FamilyChildFinanceDraft[],
  localId: string,
  patch: Partial<Omit<FamilyChildFinanceDraft, 'localId' | 'studentId'>>,
): FamilyChildFinanceDraft[] {
  return drafts.map((draft) => (draft.localId === localId ? { ...draft, ...patch } : draft));
}

export function setFamilyFinanceDraftIncluded(
  drafts: FamilyChildFinanceDraft[],
  localId: string,
  included: boolean,
): FamilyChildFinanceDraft[] {
  return patchFamilyFinanceDraft(drafts, localId, { included });
}

export function applyPreviewToFamilyFinanceDraft(
  draft: FamilyChildFinanceDraft,
  preview: AssignPlanPreviewState,
): FamilyChildFinanceDraft {
  if (preview.kind === 'ready' && preview.plan.suggestSnapshot) {
    const nextFinance = draft.hasLocalCustomization && draft.financeState
      ? {
          ...defaultStudentCreateFinanceFormState(preview.plan.suggestSnapshot),
          customizePlan: draft.financeState.customizePlan,
          customizationReason: draft.financeState.customizationReason,
          customizationNotes: draft.financeState.customizationNotes,
          planDiscount: { ...draft.financeState.planDiscount },
          selectedFeePlanId:
            draft.financeState.selectedFeePlanId ?? preview.plan.suggestSnapshot.fee_plan_id,
        }
      : defaultStudentCreateFinanceFormState(preview.plan.suggestSnapshot);
    return {
      ...draft,
      previewLoading: false,
      preview,
      financeState: nextFinance,
      previewErrorMessage: undefined,
    };
  }

  return {
    ...draft,
    previewLoading: false,
    preview,
    financeState: null,
    previewErrorMessage:
      preview.kind === 'error' ? preview.message ?? 'preview_error' : undefined,
  };
}

/**
 * Applies shared discount/customization settings from a source child onto targets.
 * Never copies student_id, agreement/schedule IDs, preview results, or fee_plan_id
 * across incompatible plans/levels.
 */
export function applySharedFinanceSettings(input: {
  drafts: FamilyChildFinanceDraft[];
  sourceLocalId: string;
  targetLocalIds: string[];
  /** When true, overwrite drafts that already have local customization. */
  overwriteCustomized?: boolean;
}): SharedFinanceApplyOutcome {
  const source = input.drafts.find((d) => d.localId === input.sourceLocalId);
  const skipped: SharedFinanceApplyOutcome['skipped'] = [];
  const appliedLocalIds: string[] = [];

  if (!source?.financeState || source.preview?.kind !== 'ready') {
    return { drafts: input.drafts, appliedLocalIds, skipped };
  }

  const sourceDiscount = { ...source.financeState.planDiscount };
  const sourceCustomize = source.financeState.customizePlan;
  const sourceReason = source.financeState.customizationReason;
  const sourceNotes = source.financeState.customizationNotes;

  const drafts = input.drafts.map((draft) => {
    if (!input.targetLocalIds.includes(draft.localId) || draft.localId === source.localId) {
      return draft;
    }
    if (!draft.included) {
      skipped.push({ localId: draft.localId, reason: 'excluded' });
      return draft;
    }
    if (draft.preview?.kind === 'active_agreement_exists') {
      skipped.push({ localId: draft.localId, reason: 'already_active' });
      return draft;
    }
    if (draft.preview?.kind !== 'ready' || !draft.financeState) {
      skipped.push({ localId: draft.localId, reason: 'no_preview' });
      return draft;
    }
    if (draft.hasLocalCustomization && !input.overwriteCustomized) {
      skipped.push({ localId: draft.localId, reason: 'has_local_customization' });
      return draft;
    }

    // Discount/customization only — never copy fee_plan_id, student_id, or result IDs.
    appliedLocalIds.push(draft.localId);
    return {
      ...draft,
      hasLocalCustomization: false,
      financeState: {
        ...draft.financeState,
        selectedFeePlanId: draft.financeState.selectedFeePlanId,
        customizePlan: sourceCustomize || sourceDiscount.enabled,
        customizationReason: sourceReason,
        customizationNotes: sourceNotes,
        planDiscount: { ...sourceDiscount },
      },
    };
  });

  return { drafts, appliedLocalIds, skipped };
}

export function familyFinanceOutcomeSummary(results: FamilyChildFinanceSubmitResult[]): {
  succeeded: number;
  alreadyActive: number;
  failed: number;
  ambiguous: number;
  skipped: number;
  blocked: number;
  pending: number;
  kind: 'full_success' | 'partial_success' | 'full_failure' | 'in_progress' | 'idle';
} {
  const succeeded = results.filter((r) => r.status === 'succeeded').length;
  const alreadyActive = results.filter((r) => r.status === 'already_active').length;
  const failed = results.filter((r) => r.status === 'failed').length;
  const ambiguous = results.filter((r) => r.status === 'ambiguous').length;
  const skipped = results.filter((r) => r.status === 'skipped').length;
  const blocked = results.filter((r) => r.status === 'blocked').length;
  const pending = results.filter(
    (r) => r.status === 'pending' || r.status === 'queued' || r.status === 'submitting',
  ).length;

  const actionableDone = succeeded + alreadyActive;
  const actionableProblems = failed + ambiguous + blocked;

  let kind: 'full_success' | 'partial_success' | 'full_failure' | 'in_progress' | 'idle' =
    'idle';
  if (pending > 0) kind = 'in_progress';
  else if (actionableDone > 0 && actionableProblems === 0) kind = 'full_success';
  else if (actionableDone > 0) kind = 'partial_success';
  else if (results.length > 0 && results.some((r) => r.status !== 'skipped')) {
    kind = 'full_failure';
  }

  return {
    succeeded,
    alreadyActive,
    failed,
    ambiguous,
    skipped,
    blocked,
    pending,
    kind,
  };
}

export function shouldOfferFamilyFinanceFailedRetry(
  results: FamilyChildFinanceSubmitResult[],
): boolean {
  return results.some((r) => r.status === 'failed' && r.canRetrySafely);
}

export function includedFinanceDraftsReady(
  drafts: FamilyChildFinanceDraft[],
): { ready: FamilyChildFinanceDraft[]; notReady: FamilyChildFinanceDraft[] } {
  const included = drafts.filter((d) => d.included);
  const ready: FamilyChildFinanceDraft[] = [];
  const notReady: FamilyChildFinanceDraft[] = [];
  for (const draft of included) {
    if (
      draft.preview?.kind === 'ready' &&
      draft.preview.plan.feePlanId != null &&
      draft.preview.plan.canAssign !== false &&
      draft.financeState
    ) {
      ready.push(draft);
    } else if (draft.preview?.kind === 'active_agreement_exists') {
      // Already has a plan — treated separately at submit time, not "not ready".
      ready.push(draft);
    } else {
      notReady.push(draft);
    }
  }
  return { ready, notReady };
}
