import { describe, expect, it } from 'vitest';
import {
  collectionReportsMonthRange,
  collectionReportsMonthValueFromFilters,
  collectionReportsRangeIsWholeMonth,
  currentCollectionReportsMonthRange,
  currentCollectionReportsMonthValue,
  shiftCollectionReportsMonth,
} from '@/features/admin/finance/utils/collection-reports-period';

const NOW = new Date(2026, 8, 10, 9, 0, 0);

describe('collection reports month period helpers', () => {
  it('uses the current calendar month as the page default', () => {
    expect(currentCollectionReportsMonthValue(NOW)).toBe('2026-09');
    expect(currentCollectionReportsMonthRange(NOW)).toEqual({
      dateMode: 'range',
      date: '',
      dateFrom: '2026-09-01',
      dateTo: '2026-09-30',
    });
  });

  it('builds full calendar month ranges without changing the backend date contract', () => {
    expect(collectionReportsMonthRange('2026-10', NOW)).toEqual({
      dateMode: 'range',
      date: '',
      dateFrom: '2026-10-01',
      dateTo: '2026-10-31',
    });
    expect(collectionReportsMonthRange('2028-02', NOW).dateTo).toBe('2028-02-29');
  });

  it('recognizes only exact full-month ranges', () => {
    expect(
      collectionReportsRangeIsWholeMonth({
        dateMode: 'range',
        dateFrom: '2026-09-01',
        dateTo: '2026-09-30',
      }),
    ).toBe(true);
    expect(
      collectionReportsRangeIsWholeMonth({
        dateMode: 'range',
        dateFrom: '2026-09-10',
        dateTo: '2026-09-30',
      }),
    ).toBe(false);
  });

  it('moves month navigation across year boundaries', () => {
    expect(shiftCollectionReportsMonth('2026-12', 1)).toBe('2027-01');
    expect(shiftCollectionReportsMonth('2026-01', -1)).toBe('2025-12');
  });

  it('falls back to the current month when filters are not a whole month', () => {
    expect(
      collectionReportsMonthValueFromFilters(
        {
          dateMode: 'range',
          dateFrom: '2026-08-15',
          dateTo: '2026-09-10',
        },
        NOW,
      ),
    ).toBe('2026-09');
  });
});
