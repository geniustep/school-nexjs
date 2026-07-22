import type { StudentCreateFinanceFormState } from '@/types/student-enrollment-finance';
import { parseDiscountPayloadValue } from './normalize-discount-percent';
import type { FamilyChildFinanceDraft } from './family-registration-finance-state';
import { includedFinanceDraftsReady } from './family-registration-finance-state';

export interface FamilyFinanceDraftFieldErrors {
  message?: string;
  byLocalId: Record<
    string,
    {
      message?: string;
      feePlan?: string;
      discount?: string;
      reason?: string;
    }
  >;
}

function validateFinanceCustomization(
  financeState: StudentCreateFinanceFormState,
  t: (key: string, params?: Record<string, string | number>) => string,
): { discount?: string; reason?: string } {
  const errors: { discount?: string; reason?: string } = {};
  if (!financeState.customizePlan && !financeState.planDiscount.enabled) {
    return errors;
  }

  if (financeState.planDiscount.enabled) {
    if (!financeState.planDiscount.type) {
      errors.discount = t('admin.student360.create.finance.discountType');
      return errors;
    }
    const rawValue = financeState.planDiscount.value.trim().replace(',', '.');
    const rawNumber = rawValue === '' ? NaN : Number(rawValue);
    if (!Number.isFinite(rawNumber) || rawNumber < 0) {
      errors.discount = t('admin.student360.familyRegistration.finance.errors.invalidDiscount');
      return errors;
    }
    const value = parseDiscountPayloadValue(
      financeState.planDiscount.type,
      financeState.planDiscount.value,
    );
    if (value == null || value < 0) {
      errors.discount = t('admin.student360.familyRegistration.finance.errors.invalidDiscount');
      return errors;
    }
    if (financeState.planDiscount.type === 'percent' && (rawNumber > 100 || value > 100)) {
      errors.discount = t('admin.student360.create.finance.errors.percentTooHigh');
      return errors;
    }
  }

  const needsReason =
    financeState.customizePlan ||
    financeState.planDiscount.enabled ||
    Object.values(financeState.lineDiscounts).some((d) => d.enabled);
  if (needsReason && !financeState.customizationReason.trim()) {
    errors.reason = t('admin.student360.create.finance.reasonRequired');
  }

  return errors;
}

export function validateFamilyFinanceDrafts(
  drafts: FamilyChildFinanceDraft[],
  t: (key: string, params?: Record<string, string | number>) => string,
): { ok: true } | { ok: false; errors: FamilyFinanceDraftFieldErrors } {
  const included = drafts.filter((d) => d.included);
  if (included.length === 0) {
    return {
      ok: false,
      errors: {
        message: t('admin.student360.familyRegistration.finance.errors.noneSelected'),
        byLocalId: {},
      },
    };
  }

  const { notReady } = includedFinanceDraftsReady(drafts);
  const byLocalId: FamilyFinanceDraftFieldErrors['byLocalId'] = {};

  for (const draft of notReady) {
    if (draft.previewLoading) {
      byLocalId[draft.localId] = {
        message: t('admin.student360.familyRegistration.finance.errors.previewLoading'),
      };
      continue;
    }
    if (draft.preview?.kind === 'no_eligible_plan') {
      byLocalId[draft.localId] = {
        feePlan: t('admin.student360.familyRegistration.finance.errors.noEligiblePlan'),
      };
      continue;
    }
    if (draft.preview?.kind === 'missing_academic_enrollment') {
      byLocalId[draft.localId] = {
        message: t('admin.student360.familyRegistration.finance.errors.missingEnrollment'),
      };
      continue;
    }
    if (draft.preview?.kind === 'candidate_selection') {
      byLocalId[draft.localId] = {
        feePlan: t('admin.student360.familyRegistration.finance.errors.planSelectionRequired'),
      };
      continue;
    }
    byLocalId[draft.localId] = {
      message:
        draft.previewErrorMessage ||
        t('admin.student360.familyRegistration.finance.errors.previewRequired'),
    };
  }

  for (const draft of included) {
    if (draft.preview?.kind === 'active_agreement_exists') continue;
    if (draft.preview?.kind !== 'ready' || !draft.financeState) continue;
    const customizationErrors = validateFinanceCustomization(draft.financeState, t);
    if (customizationErrors.discount || customizationErrors.reason) {
      byLocalId[draft.localId] = {
        ...(byLocalId[draft.localId] ?? {}),
        ...customizationErrors,
      };
    }
  }

  if (Object.keys(byLocalId).length > 0) {
    return {
      ok: false,
      errors: {
        message: t('admin.student360.familyRegistration.finance.errors.notReadySummary', {
          count: Object.keys(byLocalId).length,
        }),
        byLocalId,
      },
    };
  }

  return { ok: true };
}

export function describeSharedFinanceApplyFields(
  t: (key: string) => string,
): string[] {
  return [
    t('admin.student360.familyRegistration.finance.sharedFields.discount'),
    t('admin.student360.familyRegistration.finance.sharedFields.customize'),
    t('admin.student360.familyRegistration.finance.sharedFields.reason'),
  ];
}
