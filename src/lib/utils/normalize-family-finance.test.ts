import { describe, expect, it } from 'vitest';
import {
  familyFinanceErrorMessageKey,
  familyFinanceServiceTypeLabelKey,
  formatFamilyChildClassLevel,
  normalizeFamilyCollectionContext,
  normalizeFamilyCollectionPreviewResponse,
  normalizeFamilyFinanceSummary,
  normalizeFamilyPlanContext,
} from '@/lib/utils/normalize-family-finance';

describe('normalizeFamilyFinanceSummary', () => {
  it('normalizes single-child family without siblings', () => {
    const summary = normalizeFamilyFinanceSummary({
      family_id: 9046,
      billing_partner_name: 'Guardian A',
      student_count: 1,
      total_net_due: 5000,
      total_paid: 2000,
      total_remaining: 3000,
      total_overdue: 500,
      credit_balance: 0,
      unallocated_amount: 0,
      children: [
        {
          student_id: 1924,
          student_name: 'Student A',
          level_name: 'Primary',
          class_name: '1A',
          total_net_due: 5000,
          total_paid: 2000,
          total_remaining: 3000,
          total_overdue: 500,
          services_summary: [{ service_type: 'tuition', label: 'Tuition' }],
        },
      ],
    });

    expect(summary?.family_id).toBe(9046);
    expect(summary?.children).toHaveLength(1);
    expect(summary?.total_net_due).toBe(5000);
    expect(summary?.children[0]?.services_summary[0]?.service_type).toBe('tuition');
  });

  it('normalizes multi-child family totals from API', () => {
    const summary = normalizeFamilyFinanceSummary({
      family_id: 9046,
      billing_partner_id: 9046,
      display_name: 'Family QA',
      summary: {
        student_count: 2,
        total_net_due: 8000,
        total_paid: 3000,
        total_remaining: 5000,
        total_overdue: 1200,
        credit_balance: 100,
        unallocated_amount: 50,
      },
      children: [
        {
          student_id: 1,
          student_name: 'A',
          total_net_due: 4000,
          services_summary: [{ service_type: 'tuition' }],
        },
        {
          student_id: 2,
          student_name: 'B',
          total_net_due: 4000,
          services_summary: [
            { service_type: 'tuition' },
            { service_type: 'transport', label: 'Bus' },
          ],
        },
      ],
    });

    expect(summary?.children).toHaveLength(2);
    expect(summary?.total_remaining).toBe(5000);
    expect(summary?.children[1]?.services_summary).toHaveLength(2);
    expect(summary?.children[1]?.services_summary[1]?.service_type).toBe('transport');
  });

  it('returns null when family id is missing', () => {
    expect(normalizeFamilyFinanceSummary({ children: [] })).toBeNull();
  });

  it('reads live Odoo summary shape (family_display_name, guardian, children_count, net_due)', () => {
    const summary = normalizeFamilyFinanceSummary({
      family_id: 9046,
      family_display_name: 'ActiveSid Smoke',
      guardian: { billing_partner_id: 9046, billing_partner_name: 'ActiveSid Smoke' },
      children_count: 1,
      total_net_due: 0,
      total_paid: 0,
      total_remaining: 0,
      total_overdue: 2500,
      credit_balance: 50,
      unallocated_amount: 50,
      children: [
        {
          student_id: 1924,
          student_name: 'ActiveSid Smoke',
          class_name: 'P1A',
          net_due: 0,
          paid_amount: 0,
          remaining_amount: 0,
          overdue_amount: 2500,
          services_summary: [],
        },
      ],
    });

    expect(summary?.display_name).toBe('ActiveSid Smoke');
    expect(summary?.billing_partner_id).toBe(9046);
    expect(summary?.student_count).toBe(1);
    expect(summary?.total_overdue).toBe(2500);
    expect(summary?.credit_balance).toBe(50);
    expect(summary?.children[0]?.total_overdue).toBe(2500);
  });
  it('reads next_due family fields from summary payload', () => {
    const summary = normalizeFamilyFinanceSummary({
      family_id: 8801,
      total_remaining: 28600,
      total_overdue: 1800,
      next_due_date: '2026-07-14',
      next_due_amount: 1800,
      next_due_student_id: 202,
      next_due_scope: 'family',
      children: [
        { student_id: 101, student_name: 'A', services_summary: [] },
        { student_id: 202, student_name: 'B', services_summary: [] },
      ],
    });

    expect(summary?.next_due_scope).toBe('family');
    expect(summary?.next_due_student_id).toBe(202);
    expect(summary?.next_due_amount).toBe(1800);
    expect(summary?.total_remaining).toBe(28600);
  });
});

describe('normalizeFamilyPlanContext', () => {
  it('reads sibling plan context and discount hint', () => {
    const context = normalizeFamilyPlanContext({
      family_id: 9046,
      sibling_count: 2,
      siblings: [
        { student_id: 2, student_name: 'Sibling B', has_active_agreement: true },
        { student_id: 3, student_name: 'Sibling C', has_active_agreement: false },
      ],
      has_active_sibling_agreements: true,
      family_has_overdue: true,
      eligible_family_discount_hint: { eligible: true, reason: 'policy' },
    });

    expect(context?.siblings).toHaveLength(2);
    expect(context?.eligible_family_discount_hint?.eligible).toBe(true);
    expect(context?.family_has_overdue).toBe(true);
  });

  it('derives flags from live Odoo shape (active_agreements, family_overdue_amount)', () => {
    const context = normalizeFamilyPlanContext({
      family_account: { family_id: 9046, display_name: 'ActiveSid Smoke' },
      siblings: [],
      active_agreements: [],
      eligible_family_discount_hint: {
        eligible: false,
        message: 'No sibling discount hint — single child or inactive siblings.',
      },
      family_overdue_amount: 2500,
    });

    expect(context?.family_id).toBe(9046);
    expect(context?.has_active_sibling_agreements).toBe(false);
    expect(context?.family_has_overdue).toBe(true);
    expect(context?.eligible_family_discount_hint?.eligible).toBe(false);
  });
});

describe('normalizeFamilyCollectionContext (live Odoo shape)', () => {
  it('reads totals from nested family_summary and open installments with label', () => {
    const ctx = normalizeFamilyCollectionContext({
      family_summary: {
        family_id: 9046,
        total_remaining: 0,
        total_overdue: 2500,
        credit_balance: 50,
        unallocated_amount: 50,
      },
      open_installments: [
        {
          installment_id: 6885,
          student_id: 1924,
          student_name: 'ActiveSid Smoke',
          service_type: 'registration',
          label: 'التسجيل — قسط 1/1',
          due_date: '2026-06-20',
          remaining_amount: 2500,
          is_overdue: true,
          collectible: true,
        },
      ],
    });

    expect(ctx?.family_id).toBe(9046);
    expect(ctx?.total_overdue).toBe(2500);
    expect(ctx?.credit_balance).toBe(50);
    expect(ctx?.open_installments).toHaveLength(1);
    expect(ctx?.open_installments[0]?.service_type).toBe('registration');
    expect(ctx?.open_installments[0]?.service_label).toContain('التسجيل');
    expect(ctx?.open_installments[0]?.is_overdue).toBe(true);
    expect(ctx?.open_installments[0]?.collectible).toBe(true);
  });
});

describe('normalizeFamilyCollectionPreviewResponse', () => {
  it('normalizes allocated and credit amounts', () => {
    const preview = normalizeFamilyCollectionPreviewResponse({
      amount: 3000,
      allocated_amount: 2500,
      unallocated_amount: 0,
      credit_amount: 500,
      allocation_mode: 'leave_as_family_credit',
      allocations: [
        {
          student_id: 1924,
          student_name: 'Student A',
          allocated_amount: 2500,
          service_type: 'tuition',
        },
      ],
      warnings: ['partial'],
      errors: [],
    });

    expect(preview?.allocated_amount).toBe(2500);
    expect(preview?.credit_amount).toBe(500);
    expect(preview?.allocations).toHaveLength(1);
    expect(preview?.warnings).toEqual(['partial']);
  });
});

describe('familyFinanceErrorMessageKey', () => {
  it('maps family_not_resolved', () => {
    expect(familyFinanceErrorMessageKey('family_not_resolved')).toBe(
      'admin.student360.familyFinance.errors.notResolved',
    );
  });

  it('maps forbidden', () => {
    expect(familyFinanceErrorMessageKey('forbidden')).toBe(
      'admin.student360.familyFinance.errors.forbidden',
    );
  });
});

describe('familyFinanceServiceTypeLabelKey', () => {
  it('maps transport service type', () => {
    expect(familyFinanceServiceTypeLabelKey('transport')).toBe(
      'admin.student360.familyFinance.services.transport',
    );
  });
});

describe('formatFamilyChildClassLevel', () => {
  it('joins level and class labels', () => {
    expect(
      formatFamilyChildClassLevel({
        student_id: 1,
        services_summary: [],
        level_name: 'Primary',
        class_name: '1A',
      }),
    ).toBe('Primary · 1A');
  });
});
