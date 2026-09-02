import type {
  FinanceInstallmentListSummary,
  FinanceInstallmentServiceFacet,
  FinanceInstallmentTimelinePoint,
} from '@/types/finance';

export type InstallmentPerformance = {
  totalAmount: number;
  paidAmount: number;
  expectedAmount: number;
  overdueAmount: number;
  remainingAmount: number;
  collectionRate: number;
};

function money(value: number | null | undefined): number {
  return Number.isFinite(value) ? Math.max(Number(value), 0) : 0;
}

export function clampPercent(value: number | null | undefined): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(Math.max(Number(value), 0), 100);
}

export function resolveInstallmentPerformance(
  source: FinanceInstallmentListSummary | FinanceInstallmentServiceFacet | null | undefined,
): InstallmentPerformance {
  const remainingAmount = money(source?.total_remaining);
  const overdueAmount = Math.min(money(source?.total_overdue), remainingAmount);
  const expectedAmount = money(
    source?.total_expected ?? Math.max(remainingAmount - overdueAmount, 0),
  );
  const paidAmount = money(source?.total_paid);
  const totalAmount = money(
    source?.total_amount ?? paidAmount + remainingAmount,
  );
  const collectionRate = clampPercent(
    source?.collection_rate ?? (totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0),
  );

  return {
    totalAmount,
    paidAmount,
    expectedAmount,
    overdueAmount,
    remainingAmount,
    collectionRate,
  };
}

export function segmentPercent(amount: number, total: number): number {
  if (total <= 0 || amount <= 0) return 0;
  return Math.min((amount / total) * 100, 100);
}

export function rankedServiceFacets(
  facets: FinanceInstallmentServiceFacet[],
): FinanceInstallmentServiceFacet[] {
  return [...facets].sort((a, b) => {
    const totalDiff = resolveInstallmentPerformance(b).totalAmount - resolveInstallmentPerformance(a).totalAmount;
    if (totalDiff !== 0) return totalDiff;
    return a.service_name.localeCompare(b.service_name);
  });
}

export function highestOverdueService(
  facets: FinanceInstallmentServiceFacet[],
): FinanceInstallmentServiceFacet | null {
  return [...facets]
    .filter((facet) => money(facet.total_overdue) > 0)
    .sort((a, b) => money(b.total_overdue) - money(a.total_overdue))[0] ?? null;
}

export function lowestCollectionService(
  facets: FinanceInstallmentServiceFacet[],
): FinanceInstallmentServiceFacet | null {
  return [...facets]
    .filter((facet) => resolveInstallmentPerformance(facet).totalAmount > 0)
    .sort(
      (a, b) =>
        resolveInstallmentPerformance(a).collectionRate -
        resolveInstallmentPerformance(b).collectionRate,
    )[0] ?? null;
}

export function timelineWindow(
  timeline: FinanceInstallmentTimelinePoint[],
  maxPoints = 8,
): FinanceInstallmentTimelinePoint[] {
  return [...timeline]
    .sort((a, b) => a.period.localeCompare(b.period))
    .slice(-maxPoints);
}

export function formatTimelinePeriod(period: string, locale: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(period);
  if (!match) return period;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1));
  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}
