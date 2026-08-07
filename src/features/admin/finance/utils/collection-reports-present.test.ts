import { describe, expect, it } from 'vitest';
import { endpoints } from '@/lib/api/endpoints';
import { buildOdooApiUrl } from '@/lib/api/build-odoo-api-url';
import {
  aggregationRowsForDimension,
  buildCollectionReportsAggregationsQuery,
  buildCollectionReportsQuery,
  collectionReportsHasActiveQuery,
  defaultCollectionReportsFilters,
  displayAmountForDetailRow,
  drilldownFilterFromAggregation,
  isUnallocatedDetailRow,
  moneyOrZero,
  normalizeCollectionReportDetailRow,
  normalizeCollectionReportsAggregationsPayload,
  normalizeCollectionReportsDetailsPayload,
  primaryAggregationAmount,
  resolveCollectionReportsEmptyVariant,
  todayIsoDate,
} from '@/features/admin/finance/utils/collection-reports-present';

const ODOO_BASE = 'https://app.propanel.ma';
const API_PREFIX = '/api/v1';
const SCHOOL_ID = 3;

describe('collection reports contract helpers', () => {
  it('maps details and aggregations endpoints under admin finance reports', () => {
    expect(endpoints.admin.financeCollectionReports).toBe('/admin/finance/reports/collections');
    expect(endpoints.admin.financeCollectionReportsAggregations).toBe(
      '/admin/finance/reports/collections/aggregations',
    );
  });

  it('builds Odoo URLs once with /api/v1 and without inventing school_id query', () => {
    const filters = {
      ...defaultCollectionReportsFilters(new Date('2026-08-07T12:00:00')),
      date: '2026-08-07',
      cycle: 'primary',
      levelId: '12',
      paymentMethod: 'cash',
      page: 2,
    };
    const query = buildCollectionReportsQuery(filters);
    expect(query).toEqual({
      page: 2,
      page_size: 50,
      date: '2026-08-07',
      cycle: 'primary',
      level_id: 12,
      payment_method: 'cash',
    });
    expect(query).not.toHaveProperty('school_id');

    const url = buildOdooApiUrl(ODOO_BASE, API_PREFIX, endpoints.admin.financeCollectionReports, {
      ...query,
      active_school_id: SCHOOL_ID,
    });
    const parsed = new URL(url);
    expect(parsed.pathname).toBe('/api/v1/admin/finance/reports/collections');
    expect(parsed.searchParams.get('date')).toBe('2026-08-07');
    expect(parsed.searchParams.get('active_school_id')).toBe('3');
    expect(parsed.searchParams.get('school_id')).toBeNull();
    expect(url.match(/\/api\/v1/g)?.length).toBe(1);
  });

  it('uses date_from/date_to for range mode and omits page from aggregations query', () => {
    const filters = {
      ...defaultCollectionReportsFilters(),
      dateMode: 'range' as const,
      date: '',
      dateFrom: '2026-08-01',
      dateTo: '2026-08-07',
      page: 3,
    };
    expect(buildCollectionReportsQuery(filters)).toMatchObject({
      date_from: '2026-08-01',
      date_to: '2026-08-07',
      page: 3,
    });
    expect(buildCollectionReportsQuery(filters)).not.toHaveProperty('date');
    const aggs = buildCollectionReportsAggregationsQuery(filters);
    expect(aggs).not.toHaveProperty('page');
    expect(aggs).not.toHaveProperty('page_size');
    expect(aggs.date_from).toBe('2026-08-01');
  });

  it('separates empty day from no-match and treats zero money as zero', () => {
    expect(resolveCollectionReportsEmptyVariant({ hasActiveQuery: false })).toBe('no-data');
    expect(resolveCollectionReportsEmptyVariant({ hasActiveQuery: true })).toBe('no-match');
    expect(moneyOrZero(0)).toBe(0);
    expect(moneyOrZero(null)).toBe(0);
    expect(moneyOrZero('10.33')).toBe(10.33);
  });

  it('detects active query when date differs from today default', () => {
    const today = todayIsoDate(new Date('2026-08-07T12:00:00'));
    expect(
      collectionReportsHasActiveQuery(
        { ...defaultCollectionReportsFilters(new Date('2026-08-07T12:00:00')), date: today },
        { date: today },
      ),
    ).toBe(false);
    expect(
      collectionReportsHasActiveQuery(
        {
          ...defaultCollectionReportsFilters(new Date('2026-08-07T12:00:00')),
          date: '2026-01-01',
        },
        { date: today },
      ),
    ).toBe(true);
    expect(
      collectionReportsHasActiveQuery({
        ...defaultCollectionReportsFilters(),
        search: 'أحمد',
      }),
    ).toBe(true);
  });

  it('normalizes details summary and allocation amount without summing collection totals', () => {
    const payload = normalizeCollectionReportsDetailsPayload({
      summary: {
        total_confirmed_collections_amount: 2500,
        collections_count: 1,
        distinct_payers_count: 1,
        allocated_amount: 2500,
        unallocated_amount: 0,
        allocations_count: 2,
        distinct_students_count: 2,
      },
      items: [
        {
          row_kind: 'allocation',
          collection_id: 10,
          allocation_id: 1,
          payment_date: '2026-08-07',
          student: { id: 1, display_name: 'ابن أ' },
          payer: { display_name: 'ولي' },
          cycle: { id: 'primary', display_name: 'ابتدائي' },
          level: { id: 1, display_name: 'الأولى' },
          class: { id: 2, display_name: '1أ' },
          service: { id: 3, display_name: 'تمدرس' },
          payment_method: 'cash',
          allocated_amount: 1000,
          collection_amount: 2500,
          collection_amount_summable: false,
        },
        {
          row_kind: 'allocation',
          collection_id: 10,
          allocation_id: 2,
          payment_date: '2026-08-07',
          student: { id: 2, display_name: 'ابن ب' },
          payer: { display_name: 'ولي' },
          cycle: { id: 'middle_school', display_name: 'إعدادي' },
          level: { id: 4, display_name: 'إعدادي' },
          class: { id: 5, display_name: 'م1أ' },
          service: { id: 3, display_name: 'تمدرس' },
          payment_method: 'cash',
          allocated_amount: 1500,
          collection_amount: 2500,
          collection_amount_summable: false,
        },
      ],
    });

    expect(payload?.summary.total_confirmed_collections_amount).toBe(2500);
    expect(payload?.summary.collections_count).toBe(1);
    expect(payload?.items).toHaveLength(2);
    expect(payload?.items.every((row) => row.collection_amount_summable === false)).toBe(true);
    expect(displayAmountForDetailRow(payload!.items[0])).toBe(1000);
    expect(displayAmountForDetailRow(payload!.items[1])).toBe(1500);
    const visualSumIfWrong = payload!.items.reduce(
      (sum, row) => sum + (row.collection_amount ?? 0),
      0,
    );
    expect(visualSumIfWrong).toBe(5000);
    const correctAllocSum = payload!.items.reduce(
      (sum, row) => sum + displayAmountForDetailRow(row),
      0,
    );
    expect(correctAllocSum).toBe(2500);
  });

  it('keeps unallocated remainder independent of student/level/class', () => {
    const row = normalizeCollectionReportDetailRow({
      row_kind: 'unallocated_remainder',
      collection_id: 9,
      is_unallocated: true,
      payment_date: '2026-08-07',
      payer: { display_name: 'ولي' },
      student: { id: 1, display_name: 'should-ignore' },
      level: { id: 1, display_name: 'should-ignore' },
      class: { id: 2, display_name: 'should-ignore' },
      cycle: { id: 'primary', display_name: 'should-ignore' },
      service: { id: 3, display_name: 'should-ignore' },
      payment_method: 'cash',
      allocated_amount: 600,
      collection_amount: 3000,
      collection_amount_summable: false,
    });
    expect(isUnallocatedDetailRow(row!)).toBe(true);
    expect(row?.student).toBeNull();
    expect(row?.level).toBeNull();
    expect(row?.class).toBeNull();
    expect(row?.cycle).toBeNull();
    expect(row?.service).toBeNull();
    expect(displayAmountForDetailRow(row!)).toBe(600);
  });

  it('normalizes aggregations for all five dimensions', () => {
    const payload = normalizeCollectionReportsAggregationsPayload({
      summary: {
        total_confirmed_collections_amount: 1000,
        collections_count: 2,
        allocated_amount: 1000,
        unallocated_amount: 0,
      },
      aggregations: {
        by_cycle: [{ id: 'primary', display_name: 'ابتدائي', allocated_amount: 400, collections_count: 1 }],
        by_level: [{ id: 1, display_name: 'أولى', allocated_amount: 400, allocations_count: 1 }],
        by_class: [{ id: 2, display_name: '1أ', allocated_amount: 400, distinct_students_count: 1 }],
        by_service: [{ id: 3, display_name: 'تمدرس', allocated_amount: 700, allocations_count: 1 }],
        by_payment_method: [
          {
            id: 'cash',
            display_name: 'cash',
            collections_amount: 400,
            allocated_amount: 400,
            collections_count: 1,
          },
          {
            id: 'bank_transfer',
            display_name: 'bank_transfer',
            collections_amount: 600,
            allocated_amount: 600,
            collections_count: 1,
          },
        ],
      },
    });

    expect(aggregationRowsForDimension(payload!.aggregations, 'cycle')).toHaveLength(1);
    expect(aggregationRowsForDimension(payload!.aggregations, 'level')[0].allocated_amount).toBe(400);
    expect(aggregationRowsForDimension(payload!.aggregations, 'class')[0].id).toBe(2);
    expect(aggregationRowsForDimension(payload!.aggregations, 'service')[0].allocated_amount).toBe(700);
    const methods = aggregationRowsForDimension(payload!.aggregations, 'payment_method');
    expect(primaryAggregationAmount('payment_method', methods[0])).toBe(400);
    expect(primaryAggregationAmount('payment_method', methods[1])).toBe(600);
  });

  it('maps aggregation drilldown to backend filter params and resets page', () => {
    expect(
      drilldownFilterFromAggregation('cycle', { id: 'primary', display_name: 'ابتدائي' }),
    ).toEqual({ cycle: 'primary', page: 1, view: 'details' });
    expect(drilldownFilterFromAggregation('level', { id: 12, display_name: 'أولى' })).toEqual({
      levelId: '12',
      page: 1,
      view: 'details',
    });
    expect(drilldownFilterFromAggregation('class', { id: 9, display_name: '1أ' })).toEqual({
      classId: '9',
      page: 1,
      view: 'details',
    });
    expect(drilldownFilterFromAggregation('service', { id: 3, display_name: 'تمدرس' })).toEqual({
      serviceId: '3',
      page: 1,
      view: 'details',
    });
    expect(
      drilldownFilterFromAggregation('payment_method', { id: 'cash', display_name: 'cash' }),
    ).toEqual({ paymentMethod: 'cash', page: 1, view: 'details' });
  });

  it('keeps backend summary stable across pagination inputs (presentation only)', () => {
    const summary = {
      total_confirmed_collections_amount: 300,
      collections_count: 1,
      allocated_amount: 300,
      unallocated_amount: 0,
      allocations_count: 2,
    };
    const page1 = normalizeCollectionReportsDetailsPayload({
      summary,
      items: [
        {
          row_kind: 'allocation',
          collection_id: 1,
          allocation_id: 1,
          allocated_amount: 100,
          collection_amount: 300,
          collection_amount_summable: false,
        },
      ],
    });
    const page2 = normalizeCollectionReportsDetailsPayload({
      summary,
      items: [
        {
          row_kind: 'allocation',
          collection_id: 1,
          allocation_id: 2,
          allocated_amount: 200,
          collection_amount: 300,
          collection_amount_summable: false,
        },
      ],
    });
    expect(page1?.summary).toEqual(page2?.summary);
    expect(page1?.items[0].allocation_id).not.toBe(page2?.items[0].allocation_id);
  });
});
