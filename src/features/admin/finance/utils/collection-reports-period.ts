import type { CollectionReportsFilters } from '@/features/admin/finance/utils/collection-reports-present';

type CollectionReportsDateUpdate = Pick<
  CollectionReportsFilters,
  'dateMode' | 'date' | 'dateFrom' | 'dateTo'
>;

function twoDigits(value: number): string {
  return String(value).padStart(2, '0');
}

function normalizedMonthParts(monthValue: string, now = new Date()): { year: number; month: number } {
  const match = /^(\d{4})-(\d{2})$/.exec(monthValue.trim());
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    if (month >= 1 && month <= 12) return { year, month };
  }

  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

export function currentCollectionReportsMonthValue(now = new Date()): string {
  return `${now.getFullYear()}-${twoDigits(now.getMonth() + 1)}`;
}

export function collectionReportsMonthRange(
  monthValue: string,
  now = new Date(),
): CollectionReportsDateUpdate {
  const { year, month } = normalizedMonthParts(monthValue, now);
  const lastDay = new Date(year, month, 0).getDate();
  const prefix = `${year}-${twoDigits(month)}`;

  return {
    dateMode: 'range',
    date: '',
    dateFrom: `${prefix}-01`,
    dateTo: `${prefix}-${twoDigits(lastDay)}`,
  };
}

export function currentCollectionReportsMonthRange(now = new Date()): CollectionReportsDateUpdate {
  return collectionReportsMonthRange(currentCollectionReportsMonthValue(now), now);
}

export function collectionReportsRangeIsWholeMonth(
  filters: Pick<CollectionReportsFilters, 'dateMode' | 'dateFrom' | 'dateTo'>,
): boolean {
  if (filters.dateMode !== 'range') return false;

  const fromMatch = /^(\d{4})-(\d{2})-01$/.exec(filters.dateFrom.trim());
  const toMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(filters.dateTo.trim());
  if (!fromMatch || !toMatch) return false;
  if (fromMatch[1] !== toMatch[1] || fromMatch[2] !== toMatch[2]) return false;

  const year = Number(fromMatch[1]);
  const month = Number(fromMatch[2]);
  const expectedLastDay = new Date(year, month, 0).getDate();
  return Number(toMatch[3]) === expectedLastDay;
}

export function collectionReportsMonthValueFromFilters(
  filters: Pick<CollectionReportsFilters, 'dateMode' | 'dateFrom' | 'dateTo'>,
  now = new Date(),
): string {
  if (collectionReportsRangeIsWholeMonth(filters)) {
    return filters.dateFrom.slice(0, 7);
  }
  return currentCollectionReportsMonthValue(now);
}

export function shiftCollectionReportsMonth(monthValue: string, delta: number): string {
  const { year, month } = normalizedMonthParts(monthValue);
  const shifted = new Date(year, month - 1 + delta, 1);
  return `${shifted.getFullYear()}-${twoDigits(shifted.getMonth() + 1)}`;
}
