import { describe, expect, it } from 'vitest';
import { parseFinanceQuickListResponse } from '@/lib/utils/finance-list-response';
import { parseFinanceCanonicalMetrics } from '@/lib/utils/finance-canonical';

function fixture() {
  return {
    meta: { school_id: 7, academic_year_id: 22, as_of_date: '2026-10-16', currency: { name: 'MAD' } },
    values: {
      academic_year_programmed_total: 300,
      due_to_date: 150,
      recognized_collected_to_date: 40,
      remaining_due_to_date: 110,
      overdue_amount: 20,
      future_scheduled_amount: 150,
      collection_rate_to_date: 26.67,
    },
    availability: {
      recognized_collected_to_date: { available: true },
      remaining_due_to_date: { available: true },
      overdue_amount: { available: true },
      collection_rate_to_date: { available: true },
    },
    data_quality: { historical_settlement_attribution_complete: true },
  };
}
describe('canonical finance contracts', () => {
  it('preserves all seven authoritative fields', () => {
    const c = parseFinanceCanonicalMetrics(fixture());
    expect(c?.values.due_to_date).toBe(150);
    expect(c?.values.academic_year_programmed_total).toBe(300);
  });
  it('preserves true zeros rather than treating them as missing', () => {
    const f = fixture();
    f.values.due_to_date = 0;
    expect(parseFinanceCanonicalMetrics(f)?.values.due_to_date).toBe(0);
  });
  it('rejects an old runtime without the contract', () => {
    expect(parseFinanceCanonicalMetrics({ totals: { total_due: 999 } })).toBeNull();
  });
  it('rejects data belonging to a different school or year', () => {
    expect(parseFinanceCanonicalMetrics(fixture(), { schoolId: 8 })).toBeNull();
    expect(parseFinanceCanonicalMetrics(fixture(), { academicYearId: 9 })).toBeNull();
  });
  it('keeps gated metrics unavailable when attribution is incomplete', () => {
    const f = fixture();
    f.data_quality.historical_settlement_attribution_complete = false;
    const c = parseFinanceCanonicalMetrics(f);
    expect(c?.values.recognized_collected_to_date).toBeNull();
    expect(c?.values.remaining_due_to_date).toBeNull();
    expect(c?.values.overdue_amount).toBeNull();
    expect(c?.values.collection_rate_to_date).toBeNull();
    expect(c?.values.due_to_date).toBe(150);
  });
  it('does not substitute operational values for hidden values', () => {
    const f = fixture();
    f.availability.recognized_collected_to_date.available = false;
    expect(parseFinanceCanonicalMetrics({ ...f, operational_values: { recognized_collected_to_date: 40 } })?.values.recognized_collected_to_date).toBeNull();
  });
  it('rejects a missing or malformed metric rather than inventing zero', () => {
    const f = fixture();
    const partial = { ...f, values: { ...f.values, due_to_date: undefined } };
    expect(parseFinanceCanonicalMetrics(partial)).toBeNull();
  });
  it('keeps canonical yearly totals separate from filtered installments summary', () => {
    const result = parseFinanceQuickListResponse<unknown>({
      items: [],
      summary: { total_amount: 300, total_count: 2 },
      canonical_metrics: fixture(),
    });
    expect(result.summary?.total_amount).toBe(300);
    expect(result.canonicalMetrics?.values.due_to_date).toBe(150);
    expect(result.canonicalMetrics?.meta.academic_year_id).toBe(22);
  });
  it('keeps installments list readable without an upgraded runtime', () => {
    const result = parseFinanceQuickListResponse<unknown>({
      items: [], summary: { total_amount: 300 },
    });
    expect(result.summary?.total_amount).toBe(300);
    expect(result.canonicalMetrics).toBeNull();
  });
});
