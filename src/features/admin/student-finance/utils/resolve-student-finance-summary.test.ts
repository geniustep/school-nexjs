import { describe, expect, it } from 'vitest';
import {
  hasOfficialStudentFinanceSummary,
  mapInstallmentsSummaryToStudentFinanceSummary,
} from '@/features/admin/student-finance/utils/resolve-student-finance-summary';

describe('resolve-student-finance-summary', () => {
  it('maps installments summary totals to student finance cards', () => {
    const mapped = mapInstallmentsSummaryToStudentFinanceSummary(
      {
        total_count: 11,
        total_amount: 3350,
        total_paid: 0,
        total_remaining: 3350,
        total_overdue: 0,
      },
      {
        total_due: 0,
        confirmed_paid: 0,
        remaining: 0,
        overdue: 0,
        currency: { id: 1, name: 'MAD' },
      },
    );
    expect(mapped?.total_due).toBe(3350);
    expect(mapped?.confirmed_paid).toBe(0);
    expect(mapped?.remaining).toBe(3350);
    expect(mapped?.overdue).toBe(0);
    expect(mapped?.uncovered).toBeUndefined();
    expect(mapped?.pending_cheques).toBeUndefined();
  });

  it('detects official non-zero summary', () => {
    expect(hasOfficialStudentFinanceSummary({ total_due: 3350, remaining: 3350 })).toBe(true);
    expect(hasOfficialStudentFinanceSummary({ total_due: 0, remaining: 0 })).toBe(false);
  });
});
