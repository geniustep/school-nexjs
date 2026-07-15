import { describe, expect, it } from 'vitest';
import {
  agreementCustomizationIdentityKey,
  formatEnrollmentCustomizationLabel,
  isPresentableDraftSpecialAgreement,
  resolveAgreementCustomizations,
  resolveAgreementFinanceSummary,
  resolveDraftAgreementPresentation,
  shouldSuppressFinanceEmptyState,
} from './resolve-draft-agreement-presentation';
import type { SpecialAgreementSummary } from '@/types/student-financial-overview';

const draftSpecialAgreement: SpecialAgreementSummary = {
  id: 115,
  agreement_id: 115,
  exists: true,
  state: 'draft',
  empty_draft: false,
  line_count: 3,
  total_amount: 16500,
  is_plan_customized: true,
  creates_due_after_confirmation: true,
  financial_summary: {
    original_total: 26500,
    discount_total: 10000,
    final_total: 16500,
    net_total: 16500,
    recurring_total_after_discount: 14000,
    monthly_due_amount: 1400,
    schedule_total: 16500,
  },
  customizations: [
    {
      kind: 'enrollment_customization',
      scope: 'line',
      discount_type: 'percent',
      discount_value: 50,
      reason: 'special_discount',
      line_name: 'التمدرس',
    },
    {
      kind: 'enrollment_customization',
      scope: 'period',
      periods: Array.from({ length: 10 }, (_, index) => ({ period_key: `2026-${index}`, selected: true })),
    },
  ],
};

describe('resolveDraftAgreementPresentation', () => {
  it('detects presentable draft special agreement', () => {
    expect(isPresentableDraftSpecialAgreement(draftSpecialAgreement)).toBe(true);
  });

  it('does not suppress empty state when no draft agreement exists', () => {
    const presentation = resolveDraftAgreementPresentation({});
    expect(presentation.hasDraftAgreement).toBe(false);
    expect(shouldSuppressFinanceEmptyState(presentation)).toBe(false);
  });

  it('suppresses misleading finance empty state for draft agreements', () => {
    const presentation = resolveDraftAgreementPresentation({
      financialOverview: { special_agreement: draftSpecialAgreement },
    });
    expect(presentation.hasDraftAgreement).toBe(true);
    expect(shouldSuppressFinanceEmptyState(presentation)).toBe(true);
  });

  it('exposes customized finance summary totals', () => {
    const presentation = resolveDraftAgreementPresentation({
      financialOverview: { special_agreement: draftSpecialAgreement },
    });
    expect(presentation.summary?.original_total).toBe(26500);
    expect(presentation.summary?.discount_total).toBe(10000);
    expect(presentation.summary?.final_total).toBe(16500);
    expect(presentation.summary?.monthly_due_amount).toBe(1400);
    expect(presentation.summary?.recurring_total_after_discount).toBe(14000);
  });

  it('keeps monthly and recurring totals distinct', () => {
    const summary = resolveAgreementFinanceSummary(draftSpecialAgreement);
    expect(summary?.monthly_due_amount).toBe(1400);
    expect(summary?.recurring_total_after_discount).toBe(14000);
    expect(summary?.monthly_due_amount).not.toBe(summary?.recurring_total_after_discount);
  });

  it('assigns distinct identity keys for same-line one_time customizations', () => {
    const registrationSelected = {
      kind: 'enrollment_customization' as const,
      scope: 'one_time' as const,
      line_id: 3669,
      line_name: 'التسجيل',
      selected: true,
    };
    const dueDateOverride = {
      kind: 'enrollment_customization' as const,
      scope: 'one_time' as const,
      line_id: 3669,
      line_name: 'التسجيل',
      due_date_override: '2026-09-05',
    };
    expect(agreementCustomizationIdentityKey(registrationSelected)).not.toBe(
      agreementCustomizationIdentityKey(dueDateOverride),
    );
  });

  it('dedupes enrollment customizations when customizations and enrollment_customizations overlap', () => {
    const duplicateLine = {
      kind: 'enrollment_customization' as const,
      scope: 'line' as const,
      discount_type: 'percent' as const,
      discount_value: 50,
      reason: 'special_discount',
      line_name: 'التمدرس',
    };
    const duplicatePeriod = {
      kind: 'enrollment_customization' as const,
      scope: 'period' as const,
      periods: Array.from({ length: 10 }, (_, index) => ({ period_key: `2026-${index}`, selected: true })),
    };
    const source = {
      enrollment_customizations: [duplicateLine, duplicatePeriod],
      customizations: [duplicateLine, duplicatePeriod],
    };

    const merged = resolveAgreementCustomizations(source, source, source);

    expect(merged).toHaveLength(2);
  });

  it('does not flag mismatch when only historical schedule differs from current', () => {
    const presentation = resolveDraftAgreementPresentation({
      agreementDetail: {
        id: 501,
        student_id: 900,
        state: 'active',
        financial_summary: {
          final_total: 7300,
          schedule_total: 7300,
        },
        schedule_summary: { installment_count: 11, total_amount: 7300 },
        historical_schedule_summary: { installment_count: 21, total_amount: 23200 },
      } as import('../types').FinancialAgreement,
    });
    expect(presentation.totalsMismatch).toBe(false);
  });

  it('flags mismatch when current final differs from current schedule_summary total', () => {
    const presentation = resolveDraftAgreementPresentation({
      agreementDetail: {
        id: 502,
        student_id: 900,
        state: 'active',
        financial_summary: {
          final_total: 7300,
          schedule_total: 8000,
        },
        schedule_summary: { installment_count: 11, total_amount: 8000 },
      } as import('../types').FinancialAgreement,
    });
    expect(presentation.totalsMismatch).toBe(true);
  });

  it('formats enrollment customization labels in Arabic', () => {
    const t = (key: string, values?: Record<string, string | number>) => {
      if (key === 'admin.student360.financeWorkspace.draftAgreement.customizationLinePercent') {
        return `خصم ${values?.percent}% على ${values?.line} — السبب: ${values?.reason}`;
      }
      if (key === 'admin.student360.financeWorkspace.draftAgreement.customizationSelectedPeriods') {
        return `الأشهر المختارة: ${values?.count}`;
      }
      return key;
    };
    const formatDate = (value: string) => value;
    const formatReason = () => 'تخفيض خاص';

    const lineLabel = formatEnrollmentCustomizationLabel(
      draftSpecialAgreement.customizations![0]!,
      t,
      formatDate,
      formatReason,
    );
    expect(lineLabel).not.toContain('1400');
    expect(lineLabel).toContain('خصم 50%');
    expect(lineLabel).not.toContain('special_discount');

    const periodLabel = formatEnrollmentCustomizationLabel(
      draftSpecialAgreement.customizations![1]!,
      t,
      formatDate,
      formatReason,
    );
    expect(periodLabel).toBe('الأشهر المختارة: 10');
  });
});
