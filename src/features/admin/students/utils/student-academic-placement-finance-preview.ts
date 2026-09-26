import type {
  CarryForwardFeeSupersessionPreview,
  NormalizedAcademicPlacementFinancePreview,
} from '@/types/student-finance-change-plan';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readNumber(obj: Record<string, unknown> | null, key: string): number | null {
  if (!obj) return null;
  const value = obj[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readString(obj: Record<string, unknown> | null, key: string): string | null {
  if (!obj) return null;
  const value = obj[key];
  return typeof value === 'string' && value.trim() ? value : null;
}

function readCodes(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (typeof item === 'string' && item.trim()) return [item];
    const row = asRecord(item);
    const code = readString(row, 'code');
    return code ? [code] : [];
  });
}

function readStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && Boolean(item.trim()));
}

function normalizeFeeSupersession(raw: unknown): CarryForwardFeeSupersessionPreview | null {
  const row = asRecord(raw);
  if (!row) return null;
  return {
    feeId: readNumber(row, 'fee_id'),
    feeTypeCode: readString(row, 'fee_type_code'),
    serviceCode: readString(row, 'service_code'),
    lockedObligationTotal: readNumber(row, 'locked_obligation_total'),
    replaceableObligationTotal: readNumber(row, 'replaceable_obligation_total'),
    recognizedPaid: readNumber(row, 'recognized_paid'),
    balanceBefore: readNumber(row, 'balance_before'),
    totalBenefit: readNumber(row, 'total_benefit'),
    consumedBenefit: readNumber(row, 'consumed_benefit'),
    residualCustomization: readNumber(row, 'residual_customization'),
    targetFutureBase: readNumber(row, 'target_future_base'),
    targetFutureNet: readNumber(row, 'target_future_net'),
    futurePeriodCount: readNumber(row, 'future_period_count'),
    semantics: readString(row, 'semantics'),
  };
}

export function financeReviewReasons(details: unknown): string[] {
  const row = asRecord(details);
  return readStrings(row?.finance_review_reasons);
}

export function shouldOfferAcademicPlacementCarryForward(
  code: string | null | undefined,
  details: unknown,
): boolean {
  if (code !== 'finance_review_required') return false;
  const reasons = financeReviewReasons(details);
  return reasons.length === 1 && reasons[0] === 'target_level_not_covered_by_fee_plan';
}

export function normalizeAcademicPlacementFinancePreview(
  raw: unknown,
): NormalizedAcademicPlacementFinancePreview {
  const root = asRecord(raw) ?? {};
  const current = asRecord(root.current_agreement) ?? {};
  const effective = asRecord(root.effective_period) ?? {};
  const feeRows = Array.isArray(root.fee_supersessions) ? root.fee_supersessions : [];

  return {
    canApply: root.can_apply === true,
    previewToken: readString(root, 'preview_token'),
    targetLevelId: readNumber(root, 'target_level_id'),
    targetPlanId: readNumber(root, 'target_plan_id'),
    effectivePeriodId: readNumber(effective, 'id'),
    effectivePeriodKey: readString(effective, 'period_key'),
    currentAgreement: {
      id: readNumber(current, 'id'),
      feePlanId: readNumber(current, 'fee_plan_id'),
      paidTotal: readNumber(current, 'paid_total'),
      remainingTotal: readNumber(current, 'remaining_total'),
    },
    feeSupersessions: feeRows
      .map(normalizeFeeSupersession)
      .filter((item): item is CarryForwardFeeSupersessionPreview => Boolean(item)),
    preservedOldOnlyServices: readStrings(root.preserved_old_only_services),
    alreadySatisfiedOneTime: readStrings(root.already_satisfied_one_time),
    blockingReasons: readCodes(root.blocking_reasons),
    warnings: readCodes(root.warnings),
  };
}

export function academicPlacementFinanceTransitionErrorMessageKey(
  code: string | null | undefined,
): string {
  switch (code) {
    case 'finance_transition_preview_stale':
      return 'admin.student360.editPage.academicPlacement.financeTransition.errors.stale';
    case 'finance_transition_not_confirmed':
    case 'preview_token_required':
      return 'admin.student360.editPage.academicPlacement.financeTransition.errors.confirmationRequired';
    case 'target_fee_plan_not_found':
      return 'admin.student360.editPage.academicPlacement.financeTransition.errors.targetPlanNotFound';
    case 'target_fee_plan_ambiguous':
      return 'admin.student360.editPage.academicPlacement.financeTransition.errors.targetPlanAmbiguous';
    case 'finance_transition_line_mapping_ambiguous':
    case 'legacy_customization_semantics_ambiguous':
      return 'admin.student360.editPage.academicPlacement.financeTransition.errors.reviewRequired';
    case 'finance_transition_fee_supersession_failed':
    case 'finance_transition_duplicate_obligation_detected':
    case 'supersession_trim_unsafe':
      return 'admin.student360.editPage.academicPlacement.financeTransition.errors.financeConflict';
    case 'forbidden':
    case 'permission_denied':
    case 'unauthorized':
      return 'admin.student360.editPage.academicPlacement.financeTransition.errors.permissionDenied';
    default:
      return 'admin.student360.editPage.academicPlacement.financeTransition.errors.generic';
  }
}
