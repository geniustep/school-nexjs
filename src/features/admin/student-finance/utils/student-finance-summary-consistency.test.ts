import { describe, expect, it } from 'vitest';
import {
  hasFinanceSummaryMetrics,
  isStudentFinanceSummaryInconsistent,
  normalizeStudentFinanceSummary,
  normalizeStudentFinanceWorkspace,
  resolveStudentFinanceSummaryDisplayValue,
} from './normalize-student-finance-workspace';
import { mapInstallmentsSummaryToStudentFinanceSummary } from './resolve-student-finance-summary';

describe('normalizeStudentFinanceSummary', () => {
  it('reads workspace summary fields from the live contract', () => {
    const summary = normalizeStudentFinanceSummary({
      total_due: 1200,
      confirmed_paid: 300,
      pending_cheques: 100,
      remaining: 900,
      uncovered: 50,
      overdue: 0,
      currency: { id: 1, name: 'MAD', symbol: 'DH' },
    });
    expect(summary?.total_due).toBe(1200);
    expect(summary?.confirmed_paid).toBe(300);
    expect(summary?.remaining).toBe(900);
  });

  it('maps legacy summary aliases without inventing values', () => {
    const summary = normalizeStudentFinanceSummary({
      total_assessed: 800,
      total_paid: 200,
      total_outstanding: 600,
      total_overdue: 50,
      pending_cheque_amount: 75,
      uncovered_amount: 25,
    });
    expect(summary?.total_due).toBe(800);
    expect(summary?.confirmed_paid).toBe(200);
    expect(summary?.remaining).toBe(600);
    expect(summary?.overdue).toBe(50);
    expect(summary?.pending_cheques).toBe(75);
    expect(summary?.uncovered).toBe(25);
  });

  it('reads nested totals without defaulting undefined to zero', () => {
    const summary = normalizeStudentFinanceSummary({
      totals: {
        total_due: 500,
        confirmed_paid: 100,
      },
    });
    expect(summary?.total_due).toBe(500);
    expect(summary?.confirmed_paid).toBe(100);
    expect(summary?.remaining).toBeUndefined();
  });
});

describe('normalizeStudentFinanceWorkspace', () => {
  it('falls back to agreement currency when summary currency is null', () => {
    const workspace = normalizeStudentFinanceWorkspace({
      summary: { total_due: 100, currency: null },
      current_agreement: {
        id: 1,
        currency: { id: 2, name: 'MAD', symbol: 'DH' },
      },
    } as never);
    expect(workspace?.summary.currency?.name).toBe('MAD');
  });
});

describe('student finance summary consistency', () => {
  it('maps installments summary as authoritative source for cards', () => {
    const mapped = mapInstallmentsSummaryToStudentFinanceSummary(
      { total_amount: 3350, total_paid: 0, total_remaining: 3350, total_overdue: 0 },
      { total_due: 0, remaining: 0 },
    );
    expect(mapped?.total_due).toBe(3350);
    expect(mapped?.remaining).toBe(3350);
  });

  it('detects inconsistent zero summary when installments exist', () => {
    expect(
      isStudentFinanceSummaryInconsistent({
        workspace: {
          summary: { total_due: 0, remaining: 0 },
          installments_summary: { upcoming_count: 11, overdue_count: 0 },
        } as never,
        installmentsLoaded: true,
        installmentRowCount: 5,
      }),
    ).toBe(true);
  });

  it('accepts a real zero summary when no installment activity exists', () => {
    expect(
      isStudentFinanceSummaryInconsistent({
        workspace: {
          summary: { total_due: 0, remaining: 0 },
          installments_summary: { upcoming_count: 0, overdue_count: 0 },
        } as never,
        installmentsLoaded: true,
        installmentRowCount: 0,
      }),
    ).toBe(false);
    expect(hasFinanceSummaryMetrics({ total_due: 0, remaining: 0 })).toBe(false);
  });

  it('keeps future-only overdue at zero without marking summary inconsistent', () => {
    expect(
      isStudentFinanceSummaryInconsistent({
        workspace: {
          summary: { total_due: 1500, remaining: 1500, overdue: 0 },
          installments_summary: { upcoming_count: 3, overdue_count: 0 },
        } as never,
        installmentsLoaded: true,
        installmentRowCount: 3,
      }),
    ).toBe(false);
  });

  it('hides misleading zero cards while summary is inconsistent', () => {
    expect(resolveStudentFinanceSummaryDisplayValue(0, true)).toBeNull();
    expect(resolveStudentFinanceSummaryDisplayValue(250, true)).toBe(250);
    expect(resolveStudentFinanceSummaryDisplayValue(0, false)).toBe(0);
    expect(resolveStudentFinanceSummaryDisplayValue(undefined, false)).toBeUndefined();
  });
});
