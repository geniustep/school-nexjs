import { describe, expect, it } from 'vitest';
import {
  arrearsExportLabels,
  buildArrearsExportQuery,
  buildArrearsExportRows,
  buildArrearsPrintHtml,
  isTrustedComprehensiveArrearsExport,
  parseArrearsExportPayload,
} from './arrears-export';

const exportResponse = {
  items: [
    {
      family_id: 101,
      billing_partner_id: 101,
      family_name: 'أسرة الاختبار',
      student_count: 2,
      total_overdue: 10.5,
      total_remaining: 22.75,
      oldest_overdue_date: '2026-09-01',
      followup_status: 'payment_promise',
      followup_status_label: 'وعد بالأداء',
      payment_promise_date: '2026-09-20',
      payment_promise_amount: 7.25,
      next_followup_date: '2026-09-18',
      assigned_user_name: 'المكلف',
      currency: { code: 'MAD' },
    },
    {
      family_id: 102,
      billing_partner_id: 102,
      family_name: 'أسرة ثانية',
      student_count: 1,
      total_overdue: 20,
      total_remaining: 30,
      currency: { code: 'MAD' },
    },
  ],
  summary: {
    overdue_families_count: 2,
    total_overdue_amount: 999,
    payment_promises_count: 1,
    today_followups_count: 0,
  },
  applied_filters: {
    search: 'اختبار',
    tab: 'payment_promises',
    academic_year_id: 12,
    has_overdue: true,
    account_kind: 'family',
  },
  export_meta: {
    scope: 'all_filtered',
    row_count: 2,
    max_rows: 5000,
    truncated: false,
  },
};

describe('arrears comprehensive export contract', () => {
  it('requests the backend full filtered snapshot without pagination params', () => {
    const query = buildArrearsExportQuery('ولي', 'payment_promises');

    expect(query).toEqual({
      export: 1,
      search: 'ولي',
      tab: 'payment_promises',
      quick: 'payment_promises',
      status: 'payment_promises',
    });
    expect(query).not.toHaveProperty('page');
    expect(query).not.toHaveProperty('page_size');
  });

  it('accepts only an explicit untruncated all-filtered backend response', () => {
    const payload = parseArrearsExportPayload(exportResponse);
    expect(isTrustedComprehensiveArrearsExport(payload)).toBe(true);

    const truncated = parseArrearsExportPayload({
      ...exportResponse,
      export_meta: { ...exportResponse.export_meta, truncated: true },
    });
    expect(isTrustedComprehensiveArrearsExport(truncated)).toBe(false);

    const mismatchedCount = parseArrearsExportPayload({
      ...exportResponse,
      export_meta: { ...exportResponse.export_meta, row_count: 3 },
    });
    expect(isTrustedComprehensiveArrearsExport(mismatchedCount)).toBe(false);
  });

  it('keeps financial worksheet values numeric instead of formatted strings', () => {
    const payload = parseArrearsExportPayload(exportResponse);
    expect(payload).not.toBeNull();
    if (!payload) return;

    const rows = buildArrearsExportRows(payload);
    expect(rows[0].totalOverdue).toBe(10.5);
    expect(typeof rows[0].totalOverdue).toBe('number');
    expect(rows[0].totalRemaining).toBe(22.75);
    expect(typeof rows[0].paymentPromiseAmount).toBe('number');
  });

  it('prints A4 from backend summary and never substitutes the row sum for a global KPI', () => {
    const payload = parseArrearsExportPayload(exportResponse);
    expect(payload).not.toBeNull();
    if (!payload) return;

    const html = buildArrearsPrintHtml(
      payload,
      'ar',
      arrearsExportLabels('ar'),
      new Date('2026-09-13T12:00:00Z'),
    );

    expect(html).toContain('dir="rtl"');
    expect(html).toContain('@page { size: A4 landscape;');
    expect(html).toContain('جميع النتائج المفلترة');
    expect(html).toContain('999,00');
    expect(html).not.toContain('30,50 د.م.</strong>');
  });
});
