import { describe, expect, it } from 'vitest';
import { normalizeFinanceRepairPreview } from './normalize-finance-repair-preview';

describe('normalizeFinanceRepairPreview', () => {
  it('returns an allowed, empty preview for an empty payload', () => {
    const result = normalizeFinanceRepairPreview({});
    expect(result.allowed).toBe(true);
    expect(result.before.planNames).toEqual([]);
    expect(result.after.planNames).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(result.blockingReasons).toEqual([]);
  });

  it('parses live keep_plan preview shape with fee_plan_name and affected_records', () => {
    const result = normalizeFinanceRepairPreview({
      action_code: 'keep_fee_plan_and_cancel_overlapping_plan',
      summary: 'سيتم إلغاء 2 رسمًا و11 قسطًا من الخطة المتداخلة، مع الإبقاء على الخطة المختارة.',
      before: {
        fees_count: 4,
        total_amount: 27000,
        fee_plans: [
          {
            fee_plan_id: 2461,
            fee_plan_name: 'خطة رسوم الابتدائي 2026-2027',
            fee_ids: [2351, 2352],
          },
          {
            fee_plan_id: 2587,
            fee_plan_name: 'خطة اختبار السعر الشهري للابتدائي 2025-2026',
            fee_ids: [2395, 2396],
          },
        ],
      },
      after: {
        fees_count: 2,
        total_amount: 22500,
        kept_fee_ids: [2395, 2396],
      },
      affected_records: {
        cancel_fee_ids: [2351, 2352],
        cancel_installment_ids: [3449, 3450, 3451, 3452, 3453, 3454, 3455, 3456, 3457, 3458, 3448],
      },
      blocked: false,
      blocking_reasons: [],
      requires_confirmation: true,
      requires_reason: true,
      confirmation_label: 'تأكيد إلغاء الخطة المتداخلة',
    });

    expect(result.allowed).toBe(true);
    expect(result.summary).toContain('11 قسط');
    expect(result.before.feeCount).toBe(4);
    expect(result.before.totalAmount).toBe(27000);
    expect(result.before.planNames).toEqual([
      'خطة رسوم الابتدائي 2026-2027',
      'خطة اختبار السعر الشهري للابتدائي 2025-2026',
    ]);
    expect(result.after.keptPlanName).toBe('خطة اختبار السعر الشهري للابتدائي 2025-2026');
    expect(result.after.cancelledPlanName).toBe('خطة رسوم الابتدائي 2026-2027');
    expect(result.cancelledFeeCount).toBe(2);
    expect(result.cancelledInstallmentCount).toBe(11);
    expect(result.after.totalAmount).toBe(22500);
    expect(result.requiresReason).toBe(true);
    expect(result.requiresConfirmation).toBe(true);
  });

  it('marks not-allowed when blocked=true', () => {
    const result = normalizeFinanceRepairPreview({
      blocked: true,
      blocking_reasons: ['يجب اختيار الخطة التي تبقى.'],
    });
    expect(result.allowed).toBe(false);
    expect(result.blockingReasons).toHaveLength(1);
  });

  it('reads nested preview root and a follow-up action code', () => {
    const result = normalizeFinanceRepairPreview({
      preview: {
        before: { fees_count: 3 },
        warnings: ['سيُعاد احتساب الجدول'],
        follow_up_action: 'regularize_agreement_after_cleanup',
      },
    });
    expect(result.before.feeCount).toBe(3);
    expect(result.warnings[0].message ?? result.warnings[0].code).toBe('سيُعاد احتساب الجدول');
    expect(result.followUpActionCode).toBe('regularize_agreement_after_cleanup');
  });
});
