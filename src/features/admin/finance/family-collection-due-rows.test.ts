import { describe, expect, it } from 'vitest';
import { buildFamilyDueRows, formatFamilyDueDate } from './family-collection-due-rows';
import type { FamilyOpenInstallment } from '@/types/family-finance';
const sample: FamilyOpenInstallment[] = [
  { installment_id: 4, student_id: 1, student_name: 'A', remaining_amount: 120, is_overdue: true, collectible: true, suggestion_order: 2 },
  { installment_id: 5, student_id: 2, student_name: 'B', remaining_amount: 85.5, collectible: false, suggestion_order: 1 },
  { installment_id: 6, student_id: 2, remaining_amount: 0 },
  { installment_id: 7, student_id: 3, remaining_amount: null },
];
describe('family due rows backed by open installments', () => {
  it('shows unpaid rows before amount entry, and excludes settled/unknown dues', () => {
    expect(buildFamilyDueRows(sample, {}).map((x) => x.installment_id)).toEqual([5,4]);
  });
  it('shows non-collectible rows without changing backend truth', () => {
    const rows = buildFamilyDueRows(sample, {4:'30,5',5:'-10'});
    expect(rows[0]).toMatchObject({installment_id:5, collectible:false, remainingDue:85.5, allocatedNow:0});
    expect(rows[1]).toMatchObject({installment_id:4, remainingDue:120, allocatedNow:30.5});
  });
  it('formats date-only strings without timezone shift', () => {
    expect(formatFamilyDueDate('2026-10-23')).toBe('23/10/2026');
    expect(formatFamilyDueDate(null)).toBe('—');
  });
});
