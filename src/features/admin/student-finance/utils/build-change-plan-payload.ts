import type {
  ChangePlanActivationMode,
  ChangePlanDiscount,
  ChangePlanMode,
  ReplaceIfUnpaidChangePlanPayload,
  SocialDiscountChangePlanPayload,
} from '@/types/student-finance-change-plan';

export interface ReplaceIfUnpaidFormState {
  newFeePlanId: string;
  activationMode: ChangePlanActivationMode;
  changeReason: string;
  confirmReplace: boolean;
}

export interface SocialDiscountFormState {
  effectiveDate: string;
  feeTypeCode: string;
  discountType: 'percent' | 'amount';
  discountValue: string;
  reasonNote: string;
  affectedPeriods: string[];
  confirmFinancialImpact: boolean;
}

/** UI category slugs → Odoo service codes on agreement lines. */
const SOCIAL_FEE_TYPE_CODE_BY_UI: Record<string, string> = {
  tuition: 'TUITION',
  transport: 'TRANSPORT',
};

function resolveSocialFeeTypeCode(formCode: string): string {
  return SOCIAL_FEE_TYPE_CODE_BY_UI[formCode] ?? formCode.toUpperCase();
}

export function buildReplaceIfUnpaidPreviewPayload(
  form: ReplaceIfUnpaidFormState,
): ReplaceIfUnpaidChangePlanPayload {
  return {
    mode: 'replace_if_unpaid',
    new_fee_plan_id: Number(form.newFeePlanId),
    activation_mode: form.activationMode,
    confirm_replace_current_agreement: false,
    change_reason: form.changeReason.trim(),
  };
}

export function buildReplaceIfUnpaidApplyPayload(
  form: ReplaceIfUnpaidFormState,
): ReplaceIfUnpaidChangePlanPayload {
  return {
    ...buildReplaceIfUnpaidPreviewPayload(form),
    confirm_replace_current_agreement: true,
  };
}

export function buildSocialDiscountPreviewPayload(
  form: SocialDiscountFormState,
): SocialDiscountChangePlanPayload {
  const discounts: ChangePlanDiscount[] = [
    {
      fee_type_code: resolveSocialFeeTypeCode(form.feeTypeCode),
      type: form.discountType,
      value: Number(form.discountValue),
      discount_type: 'social',
    },
  ];
  return {
    mode: 'social_discount_on_future_installments',
    effective_date: form.effectiveDate,
    change_reason: 'social_case',
    reason_note: form.reasonNote.trim(),
    discounts,
    affected_periods: [...form.affectedPeriods],
    confirm_financial_impact: false,
  };
}

export function buildSocialDiscountApplyPayload(
  form: SocialDiscountFormState,
): SocialDiscountChangePlanPayload {
  return {
    ...buildSocialDiscountPreviewPayload(form),
    confirm_financial_impact: true,
  };
}

export function buildChangePlanPayload(
  mode: ChangePlanMode,
  form: ReplaceIfUnpaidFormState | SocialDiscountFormState,
  phase: 'preview' | 'apply',
) {
  if (mode === 'replace_if_unpaid') {
    return phase === 'preview'
      ? buildReplaceIfUnpaidPreviewPayload(form as ReplaceIfUnpaidFormState)
      : buildReplaceIfUnpaidApplyPayload(form as ReplaceIfUnpaidFormState);
  }
  return phase === 'preview'
    ? buildSocialDiscountPreviewPayload(form as SocialDiscountFormState)
    : buildSocialDiscountApplyPayload(form as SocialDiscountFormState);
}

export function monthPeriodsFromRange(startMonth: string, endMonth: string): string[] {
  const [sy, sm] = startMonth.split('-').map(Number);
  const [ey, em] = endMonth.split('-').map(Number);
  if (!sy || !sm || !ey || !em) return [];
  const out: string[] = [];
  let y = sy;
  let m = sm;
  while (y < ey || (y === ey && m <= em)) {
    out.push(`${y}-${String(m).padStart(2, '0')}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return out;
}
