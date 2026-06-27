import { describe, expect, it } from 'vitest';
import type { FinancialAgreement, StudentFinanceWorkspace } from '../types';
import { resolveAgreementsExecutiveSummary } from './resolve-agreements-executive-summary';

const activeAgreement = {
  id: 248,
  student_id: 854,
  state: 'active',
  number: 'Special agreement — raqeem 2025-2026',
  financial_summary: {
    final_total: 22500,
    net_total: 22500,
    paid_amount: 4500,
    remaining_amount: 18000,
  },
  schedule_summary: { installment_count: 11, total_amount: 22500 },
} as FinancialAgreement;

const workspaceWithActiveAndDraft = {
  summary: { confirmed_paid: 4500, remaining: 18000 },
  billing_context: { has_active_agreement: true, mode: 'active_agreement' },
  current_agreement: activeAgreement,
  agreements_summary: [
    { id: 248, state: 'active' },
    { id: 245, state: 'draft' },
    { id: 15, state: 'cancelled' },
  ],
} as unknown as StudentFinanceWorkspace;

describe('resolveAgreementsExecutiveSummary', () => {
  it('builds correct KPIs for an active agreement with summary values', () => {
    const result = resolveAgreementsExecutiveSummary({
      workspace: workspaceWithActiveAndDraft,
      agreement: activeAgreement,
      studentId: 854,
    });

    expect(result.show).toBe(true);
    expect(result.state).toBe('active');
    expect(result.totalAmount).toBe(22500);
    expect(result.paidAmount).toBe(4500);
    expect(result.remainingAmount).toBe(18000);
    expect(result.installmentCount).toBe(11);
    expect(result.currentAgreementId).toBe(248);
  });

  it('counts active / draft / historical from agreements_summary', () => {
    const result = resolveAgreementsExecutiveSummary({
      workspace: workspaceWithActiveAndDraft,
      agreement: activeAgreement,
      studentId: 854,
    });

    expect(result.counts.active).toBe(1);
    expect(result.counts.draft).toBe(1);
    expect(result.counts.historical).toBe(1);
    expect(result.counts.total).toBe(3);
  });

  it('does not invent paid/remaining when unavailable (returns null)', () => {
    const draftAgreement = {
      id: 245,
      student_id: 854,
      state: 'draft',
      number: 'FA/2026/00225',
      net_amount: 4000,
      schedule_summary: { installment_count: 10 },
    } as FinancialAgreement;

    const workspace = {
      summary: {},
      billing_context: { has_active_agreement: false },
      current_agreement: draftAgreement,
      agreements_summary: [{ id: 245, state: 'draft' }],
    } as unknown as StudentFinanceWorkspace;

    const result = resolveAgreementsExecutiveSummary({ workspace, agreement: draftAgreement, studentId: 854 });

    expect(result.totalAmount).toBe(4000);
    expect(result.paidAmount).toBeNull();
    expect(result.remainingAmount).toBeNull();
    expect(result.installmentCount).toBe(10);
  });

  it('builds the correct Finance Hub link for the current agreement', () => {
    const result = resolveAgreementsExecutiveSummary({
      workspace: workspaceWithActiveAndDraft,
      agreement: activeAgreement,
      studentId: 854,
    });

    expect(result.financeHubHref).toBe('/admin/finance/agreements/248');
  });

  it('does not change current_agreement selection (uses provided agreement id only)', () => {
    const result = resolveAgreementsExecutiveSummary({
      workspace: workspaceWithActiveAndDraft,
      agreement: activeAgreement,
      studentId: 854,
    });

    expect(result.currentAgreementId).toBe(workspaceWithActiveAndDraft.current_agreement?.id);
  });

  it('returns hidden presentation when there is no agreement', () => {
    const result = resolveAgreementsExecutiveSummary({
      workspace: { summary: {}, agreements_summary: [] } as unknown as StudentFinanceWorkspace,
      agreement: null,
      studentId: 854,
    });

    expect(result.show).toBe(false);
    expect(result.financeHubHref).toBeNull();
  });

  it('derives installment count from installments array when schedule_summary is absent', () => {
    const agreement = {
      id: 300,
      student_id: 854,
      state: 'active',
      net_amount: 1000,
      installments: [{ id: 1 }, { id: 2 }, { id: 3 }],
    } as FinancialAgreement;

    const result = resolveAgreementsExecutiveSummary({
      workspace: { summary: {}, current_agreement: agreement } as unknown as StudentFinanceWorkspace,
      agreement,
      studentId: 854,
    });

    expect(result.installmentCount).toBe(3);
  });
});
