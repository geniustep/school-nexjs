import { describe, expect, it, vi } from 'vitest';
import type { FinancialAgreement } from '../types';
import {
  filterOperationalInstallments,
  hasMeaningfulHistoricalSchedule,
  resolveCurrentInstallmentCount,
  resolveCurrentScheduleTotal,
  resolveTotalsMismatch,
  warnCancelledInOperationalInstallments,
} from './resolve-operational-schedule';

describe('resolve-operational-schedule', () => {
  const currentAgreement = {
    id: 100,
    student_id: 900,
    state: 'active',
    financial_summary: {
      final_total: 7300,
      schedule_total: 7300,
      paid_amount: 0,
      remaining_amount: 7300,
    },
    schedule_summary: { installment_count: 11, total_amount: 7300 },
    installments: Array.from({ length: 11 }, (_, index) => ({
      id: index + 1,
      amount: 663.64,
      state: 'planned',
    })),
    historical_schedule_summary: { installment_count: 21, total_amount: 23200 },
    historical_installments: [
      ...Array.from({ length: 11 }, (_, index) => ({
        id: 100 + index,
        amount: 1000,
        state: 'planned',
      })),
      ...Array.from({ length: 10 }, (_, index) => ({
        id: 200 + index,
        amount: 1220,
        state: 'cancelled',
      })),
    ],
  } as FinancialAgreement;

  it('reads current schedule totals from backend fields only', () => {
    expect(resolveCurrentScheduleTotal(currentAgreement)).toBe(7300);
    expect(resolveCurrentInstallmentCount(currentAgreement)).toBe(11);
  });

  it('does not treat historical vs current difference as totals mismatch', () => {
    expect(
      resolveTotalsMismatch({
        finalTotal: 7300,
        currentScheduleTotal: 7300,
      }),
    ).toBe(false);
    expect(hasMeaningfulHistoricalSchedule(currentAgreement)).toBe(true);
    expect(currentAgreement.historical_schedule_summary?.total_amount).toBe(23200);
  });

  it('flags real mismatch inside the current operational totals', () => {
    expect(
      resolveTotalsMismatch({
        finalTotal: 7300,
        currentScheduleTotal: 8000,
      }),
    ).toBe(true);
  });

  it('filters cancelled rows out of the operational display list', () => {
    const rows = filterOperationalInstallments([
      { id: 1, state: 'planned', amount: 500 },
      { id: 2, state: 'cancelled', amount: 500 },
      { id: 3, state: 'waived', amount: 100 },
    ]);
    expect(rows.map((row) => row.id)).toEqual([1, 3]);
  });

  it('warns in development when cancelled rows arrive inside installments', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    warnCancelledInOperationalInstallments([
      { id: 1, state: 'planned' },
      { id: 2, state: 'cancelled' },
    ]);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('hides historical section when historical fields are absent (backward compatibility)', () => {
    const legacy = {
      id: 1,
      student_id: 1,
      state: 'active',
      schedule_summary: { installment_count: 5, total_amount: 5000 },
      installments: [{ id: 1, state: 'planned' }],
    } as FinancialAgreement;
    expect(hasMeaningfulHistoricalSchedule(legacy)).toBe(false);
  });

  it('hides historical section when historical equals current', () => {
    const identical = {
      id: 1,
      student_id: 1,
      state: 'active',
      schedule_summary: { installment_count: 5, total_amount: 5000 },
      installments: Array.from({ length: 5 }, (_, i) => ({ id: i + 1, state: 'planned' })),
      historical_schedule_summary: { installment_count: 5, total_amount: 5000 },
      historical_installments: Array.from({ length: 5 }, (_, i) => ({ id: i + 1, state: 'planned' })),
    } as FinancialAgreement;
    expect(hasMeaningfulHistoricalSchedule(identical)).toBe(false);
  });
});
