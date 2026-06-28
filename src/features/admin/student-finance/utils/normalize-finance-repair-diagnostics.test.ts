import { describe, expect, it } from 'vitest';
import { normalizeFinanceRepairDiagnostics } from './normalize-finance-repair-diagnostics';

describe('normalizeFinanceRepairDiagnostics', () => {
  it('returns an unavailable, empty result for null / empty payloads', () => {
    const result = normalizeFinanceRepairDiagnostics(null);
    expect(result.available).toBe(false);
    expect(result.anomalies).toEqual([]);
    expect(result.actions).toEqual([]);
    expect(result.hasAnomalies).toBe(false);
  });

  it('parses anomalies, impacts and suggested actions (student 705-like shape)', () => {
    const result = normalizeFinanceRepairDiagnostics({
      file_status: 'blocked',
      can_apply_actions: true,
      anomalies: [
        {
          code: 'overlapping_fee_plans',
          title: 'خطتان ماليتان متداخلتان',
          description: 'يوجد خطتان في نفس السنة',
          severity: 'blocking',
          financial_impact: ['ازدواج في المبالغ المستحقة'],
        },
        {
          code: 'duplicate_registration_fee',
          title: 'رسم تسجيل مكرر',
          severity: 'warning',
          financial_impact: { amount: 500 },
        },
      ],
      suggested_actions: [
        {
          code: 'keep_fee_plan_and_cancel_overlapping_plan',
          label: 'الإبقاء على خطة وإلغاء المتداخلة',
          requires_reason: true,
          requires_confirmation: true,
          can_apply: true,
        },
      ],
      blocking_reasons: [
        { code: 'cannot_regularize_until_duplicates_cleaned', message: 'نظّف التكرار أولًا' },
      ],
    });

    expect(result.available).toBe(true);
    expect(result.health).toBe('blocked');
    expect(result.canApplyActions).toBe(true);
    expect(result.hasAnomalies).toBe(true);
    expect(result.anomalies).toHaveLength(2);
    expect(result.anomalies[0].severity).toBe('blocking');
    expect(result.anomalies[0].impacts).toContain('ازدواج في المبالغ المستحقة');
    expect(result.anomalies[1].impactAmount).toBe(500);
    expect(result.actions).toHaveLength(1);
    expect(result.actions[0].code).toBe('keep_fee_plan_and_cancel_overlapping_plan');
    expect(result.actions[0].requiresReason).toBe(true);
    expect(result.actions[0].requiresConfirmation).toBe(true);
    expect(result.actions[0].isBlocked).toBe(false);
    expect(result.blockingReasons[0].message).toBe('نظّف التكرار أولًا');
  });

  it('marks an action blocked when it carries blocking reasons (no execute path)', () => {
    const result = normalizeFinanceRepairDiagnostics({
      anomalies: [{ code: 'x', title: 'X' }],
      suggested_actions: [
        {
          code: 'risky_action',
          label: 'إجراء محجوب',
          blocking_reasons: [{ code: 'has_confirmed_payments', message: 'توجد دفعات مؤكدة' }],
        },
      ],
    });
    expect(result.actions[0].canApply).toBe(false);
    expect(result.actions[0].isBlocked).toBe(true);
    expect(result.actions[0].blockingReasons).toHaveLength(1);
  });

  it('derives health from anomalies when no explicit status is sent', () => {
    const needsReview = normalizeFinanceRepairDiagnostics({
      anomalies: [{ code: 'dup', title: 'dup', severity: 'warning' }],
    });
    expect(needsReview.health).toBe('needs_review');

    const blocked = normalizeFinanceRepairDiagnostics({
      anomalies: [{ code: 'dup', title: 'dup', severity: 'blocking' }],
    });
    expect(blocked.health).toBe('blocked');
  });

  it('reads alias field names (issues / actions / permissions)', () => {
    const result = normalizeFinanceRepairDiagnostics({
      diagnostics: {
        status: 'needs_review',
        permissions: { can_apply_actions: false },
        issues: [{ type: 'duplicate_tuition_fee', name: 'رسم تمدرس مكرر' }],
        actions: [{ action_code: 'cleanup', title: 'تنظيف' }],
      },
    });
    expect(result.available).toBe(true);
    expect(result.health).toBe('needs_review');
    expect(result.canApplyActions).toBe(false);
    expect(result.anomalies[0].code).toBe('duplicate_tuition_fee');
    expect(result.actions[0].code).toBe('cleanup');
  });

  it('reads recommended_actions and overall_status from live API shape (student 705)', () => {
    const result = normalizeFinanceRepairDiagnostics({
      overall_status: 'blocked',
      can_apply_actions: true,
      anomalies: [
        { code: 'duplicate_fee_plan_assignment', title: 'خطتان ماليتان متداخلتان', message: 'ازدواج' },
      ],
      recommended_actions: [
        {
          action_code: 'keep_fee_plan_and_cancel_overlapping_plan',
          title: 'الإبقاء على خطة وإلغاء الخطة المتداخلة',
          requires_reason: true,
          requires_confirmation: true,
          candidate_plans: [
            {
              fee_plan_id: 2587,
              fee_plan_name: 'خطة اختبار السعر الشهري للابتدائي 2025-2026',
              fees_count: 2,
              total_amount: 22500,
              removable: true,
            },
            {
              fee_plan_id: 2461,
              fee_plan_name: 'خطة رسوم الابتدائي 2026-2027',
              fees_count: 2,
              total_amount: 4500,
              removable: true,
            },
          ],
        },
        {
          action_code: 'remove_unpaid_duplicate_fee_plan_assignment',
          title: 'إلغاء خطة مكررة غير مدفوعة',
          candidate_plans: [{ fee_plan_id: 2461, fee_plan_name: 'خطة رسوم الابتدائي 2026-2027' }],
        },
      ],
    });

    expect(result.health).toBe('blocked');
    expect(result.canApplyActions).toBe(true);
    expect(result.actions).toHaveLength(2);
    expect(result.actions[0].code).toBe('keep_fee_plan_and_cancel_overlapping_plan');
    expect(result.actions[0].planSelectionMode).toBe('keep');
    expect(result.actions[0].candidatePlans).toHaveLength(2);
    expect(result.actions[0].candidatePlans[0].name).toBe(
      'خطة اختبار السعر الشهري للابتدائي 2025-2026',
    );
    expect(result.actions[1].planSelectionMode).toBe('cancel');
  });

  it('prefers recommended_actions over legacy suggested_actions', () => {
    const result = normalizeFinanceRepairDiagnostics({
      recommended_actions: [{ action_code: 'from_recommended', title: 'من الموصى' }],
      suggested_actions: [{ code: 'from_suggested', title: 'من المقترح' }],
    });
    expect(result.actions).toHaveLength(1);
    expect(result.actions[0].code).toBe('from_recommended');
  });

  it('reads the adopt_correct_schedule_into_kept_plan action with adopt mode', () => {
    const result = normalizeFinanceRepairDiagnostics({
      overall_status: 'blocked',
      can_apply_actions: true,
      recommended_actions: [
        {
          action_code: 'adopt_correct_schedule_into_kept_plan',
          title: 'اعتماد الخطة الرسمية مع جدول الأقساط الصحيح',
          requires_reason: true,
          requires_confirmation: true,
          candidate_plans: [
            { fee_plan_id: 2461, fee_plan_name: 'خطة رسوم الابتدائي 2026-2027', total_amount: 4500 },
            {
              fee_plan_id: 2587,
              fee_plan_name: 'خطة اختبار السعر الشهري للابتدائي',
              total_amount: 22500,
            },
          ],
        },
      ],
    });
    expect(result.actions).toHaveLength(1);
    expect(result.actions[0].code).toBe('adopt_correct_schedule_into_kept_plan');
    expect(result.actions[0].planSelectionMode).toBe('adopt');
    expect(result.actions[0].candidatePlans).toHaveLength(2);
    expect(result.actions[0].candidatePlans[1].name).toBe('خطة اختبار السعر الشهري للابتدائي');
  });

  it('does not break when the adopt action is absent (backend not deployed yet)', () => {
    const result = normalizeFinanceRepairDiagnostics({
      overall_status: 'blocked',
      recommended_actions: [
        { action_code: 'keep_fee_plan_and_cancel_overlapping_plan', title: 'الإبقاء' },
      ],
    });
    expect(result.actions).toHaveLength(1);
    expect(
      result.actions.some((a) => a.code === 'adopt_correct_schedule_into_kept_plan'),
    ).toBe(false);
    expect(result.available).toBe(true);
  });
});
