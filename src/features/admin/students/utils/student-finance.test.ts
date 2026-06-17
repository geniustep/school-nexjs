import { describe, expect, it } from 'vitest';
import {
  isFinanceZeroData,
  normalizeStudentFinanceOverviewSummary,
  normalizeStudentFinanceSummaryResponse,
} from './normalize-student-finance';
import { formatFinanceCurrency } from './student-finance-format';
import { resolveFinanceOverviewStatus } from './student-finance-status-summary';
import {
  canAssignStudentFees,
  canCollectStudentPayments,
  canViewStudentFinance,
  canViewStudentPayments,
} from './resolve-capabilities';

describe('normalizeStudentFinanceSummaryResponse', () => {
  it('parses full summary contract', () => {
    const data = normalizeStudentFinanceSummaryResponse({
      academic_year: { id: 1, name: '2025/2026' },
      summary: {
        currency: { name: 'MAD', symbol: 'DH', position: 'after' },
        total_assessed: 12000,
        total_discount: 1000,
        total_paid: 7000,
        total_outstanding: 4000,
        total_overdue: 1500,
        next_due_date: '2026-07-01',
      },
      billing_profile: {
        id: 20,
        state: 'active',
        billing_party_type: 'guardian',
        effective_from: '2025-09-01',
        effective_to: null,
      },
      financial_responsible: { guardian_id: 10, relationship_id: 7, name: 'Parent A' },
      capabilities: {
        can_view: true,
        can_view_payments: true,
        can_collect: true,
        can_assign_fees: false,
      },
      consistency: { financial_responsible_matches_billing_profile: true },
    });
    expect(data?.academic_year.id).toBe(1);
    expect(data?.summary.total_assessed).toBe(12000);
    expect(data?.summary.currency.symbol).toBe('DH');
    expect(data?.billing_profile?.id).toBe(20);
    expect(data?.financial_responsible?.name).toBe('Parent A');
    expect(data?.capabilities.can_collect).toBe(true);
  });

  it('parses zero-data response', () => {
    const data = normalizeStudentFinanceSummaryResponse({
      academic_year: { id: 1, name: '2025/2026' },
      summary: {
        currency: { name: 'MAD', symbol: 'DH', position: 'after' },
        total_assessed: 0,
        total_discount: 0,
        total_paid: 0,
        total_outstanding: 0,
        total_overdue: 0,
        next_due_date: null,
      },
      billing_profile: null,
      financial_responsible: null,
    });
    expect(data).not.toBeNull();
    expect(isFinanceZeroData(data!.summary)).toBe(true);
    expect(data?.billing_profile).toBeNull();
    expect(data?.financial_responsible).toBeNull();
  });

  it('returns null without academic year', () => {
    expect(normalizeStudentFinanceSummaryResponse({ summary: {} })).toBeNull();
  });
});

describe('normalizeStudentFinanceOverviewSummary', () => {
  it('normalizes overview totals from student details', () => {
    const summary = normalizeStudentFinanceOverviewSummary({
      currency: { name: 'MAD', symbol: 'DH', position: 'before' },
      total_assessed: 500,
      total_paid: 200,
      total_outstanding: 300,
      total_overdue: 0,
      total_discount: 0,
      next_due_date: null,
    });
    expect(summary?.total_assessed).toBe(500);
    expect(summary?.currency.position).toBe('before');
  });
});

describe('formatFinanceCurrency', () => {
  it('places symbol after amount by default', () => {
    expect(formatFinanceCurrency(1250, { name: 'MAD', symbol: 'DH', position: 'after' }, 'fr-FR')).toMatch(
      /DH/,
    );
  });

  it('places symbol before when position is before', () => {
    const formatted = formatFinanceCurrency(1250, { name: 'USD', symbol: '$', position: 'before' }, 'en-US');
    expect(formatted.startsWith('$')).toBe(true);
  });
});

describe('resolveFinanceOverviewStatus', () => {
  const t = (key: string) => key;

  it('uses finance fees labels instead of agreement wording', () => {
    const status = resolveFinanceOverviewStatus(
      {
        currency: { name: 'MAD', symbol: 'DH' },
        total_assessed: 22500,
        total_discount: 0,
        total_paid: 0,
        total_outstanding: 22500,
        total_overdue: 0,
        next_due_date: '2026-06-17',
      },
      t,
    );
    expect(status.actionTab).toBe('finance');
    expect(status.status).toBe('admin.student360.statusSummary.financeHasBalance');
  });
});

describe('student finance capabilities', () => {
  it('hides finance without can_view_finance', () => {
    expect(canViewStudentFinance({ can_manage: true, can_manage_guardians: true, can_view_finance: false })).toBe(
      false,
    );
  });

  it('prefers summary capabilities for payments', () => {
    expect(
      canViewStudentPayments(
        { can_manage: false, can_manage_guardians: false, can_view_finance: true, can_view_payments: false },
        { can_view: true, can_view_payments: true, can_collect: false, can_assign_fees: false, can_manage_discounts: false, can_approve_discounts: false, can_view_billing_profile: false, can_manage_billing_profile: false },
      ),
    ).toBe(true);
    expect(
      canCollectStudentPayments(
        { can_manage: false, can_manage_guardians: false, can_view_finance: true },
        { can_view: true, can_view_payments: true, can_collect: true, can_assign_fees: false, can_manage_discounts: false, can_approve_discounts: false, can_view_billing_profile: false, can_manage_billing_profile: false },
      ),
    ).toBe(true);
    expect(
      canAssignStudentFees(
        { can_manage: false, can_manage_guardians: false, can_view_finance: true, can_assign_fees: false },
        { can_view: true, can_view_payments: true, can_collect: false, can_assign_fees: true, can_manage_discounts: false, can_approve_discounts: false, can_view_billing_profile: false, can_manage_billing_profile: false },
      ),
    ).toBe(true);
  });
});

describe('consistency mismatch', () => {
  it('detects billing profile mismatch flag', () => {
    const data = normalizeStudentFinanceSummaryResponse({
      academic_year: { id: 1, name: '2025/2026' },
      summary: {
        currency: { name: 'MAD', symbol: 'DH' },
        total_assessed: 100,
        total_discount: 0,
        total_paid: 0,
        total_outstanding: 100,
        total_overdue: 0,
        next_due_date: null,
      },
      billing_profile: { id: 1, state: 'active' },
      financial_responsible: { name: 'X' },
      consistency: { financial_responsible_matches_billing_profile: false },
    });
    expect(data?.consistency?.financial_responsible_matches_billing_profile).toBe(false);
  });
});
