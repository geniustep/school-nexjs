import { describe, expect, it } from 'vitest';
import {
  buildArrearsExportQuery,
  buildArrearsPrintHtml,
  createArrearsWorkbook,
  parseArrearsExportResponse,
  type ArrearsExportContext,
} from '@/features/admin/finance/arrears-export';

const rawExport = {
  items: [
    {
      family_id: 41,
      billing_partner_id: 41,
      display_name: 'أسرة الاختبار',
      student_count: 2,
      total_overdue: 1600,
      gross_overdue_amount: 1600,
      pending_cheque_coverage_amount: 1500,
      actionable_overdue_amount: 100,
      total_remaining: 1560.75,
      oldest_overdue_date: '2026-08-15',
      followup_status: 'payment_promise',
      followup_status_label: 'وعد أداء',
      payment_promise_date: '2026-09-20',
      payment_promise_amount: 500.25,
      next_followup_date: '2026-09-18',
      assigned_user_name: 'الإدارة',
      currency: { code: 'MAD' },
    },
  ],
  summary: {
    overdue_families_count: 1,
    overdue_accounts_count: 1,
    actionable_overdue_accounts_count: 1,
    total_overdue_amount: 1600,
    total_actionable_overdue_amount: 100,
    total_pending_cheque_coverage_on_overdue: 1500,
    payment_promises_count: 1,
    today_followups_count: 0,
  },
  applied_filters: {
    search: 'اختبار',
    tab: 'payment_promises',
    has_overdue: 1,
    account_kind: 'family',
  },
  export_meta: {
    scope: 'all_filtered',
    row_count: 1,
    max_rows: 5000,
    truncated: false,
  },
};

const context: ArrearsExportContext = {
  locale: 'ar',
  generatedAt: new Date('2026-09-13T20:00:00Z'),
  schoolName: 'مدرسة الاختبار',
  search: 'اختبار',
  tabLabel: 'وعود الأداء',
};

describe('arrears comprehensive export contract', () => {
  it('requests one all-filtered export without page or page_size', () => {
    const query = buildArrearsExportQuery({
      search: ' أسرة ',
      tab: 'payment_promises',
      activeSchoolId: 7,
      supportsActionable: true,
    });

    expect(query).toEqual({
      export: 1,
      search: 'أسرة',
      tab: 'payment_promises',
      quick: 'payment_promises',
      status: 'payment_promises',
      active_school_id: 7,
      overdue_semantics: 'actionable',
    });
    expect(query).not.toHaveProperty('page');
    expect(query).not.toHaveProperty('page_size');
  });

  it('accepts only a complete all-filtered response and keeps backend summary', () => {
    const parsed = parseArrearsExportResponse(rawExport);

    expect(parsed).not.toBeNull();
    expect(parsed?.exportMeta).toEqual({
      scope: 'all_filtered',
      row_count: 1,
      max_rows: 5000,
      truncated: false,
    });
    expect(parsed?.summary.total_overdue_amount).toBe(1600);
    expect(parsed?.summary.total_actionable_overdue_amount).toBe(100);
    expect(parsed?.items).toHaveLength(1);
  });

  it('rejects partial or count-mismatched export payloads', () => {
    expect(
      parseArrearsExportResponse({
        ...rawExport,
        export_meta: { ...rawExport.export_meta, truncated: true },
      }),
    ).toBeNull();

    expect(
      parseArrearsExportResponse({
        ...rawExport,
        export_meta: { ...rawExport.export_meta, row_count: 2 },
      }),
    ).toBeNull();
  });
});

describe('arrears Excel export', () => {
  it('writes financial values as numeric worksheet cells', () => {
    const parsed = parseArrearsExportResponse(rawExport);
    expect(parsed).not.toBeNull();
    if (!parsed) return;

    const workbook = createArrearsWorkbook(parsed, context);
    const worksheet = workbook.worksheets[0];
    const dataRow = worksheet.getRow(11);

    expect(dataRow.getCell(3).value).toBe(100);
    expect(dataRow.getCell(4).value).toBe(1500);
    expect(dataRow.getCell(5).value).toBe(1600);
    expect(dataRow.getCell(6).value).toBe(1560.75);
    expect(typeof dataRow.getCell(3).value).toBe('number');
    expect(dataRow.getCell(3).numFmt).toBe('#,##0.00');
  });
});

describe('arrears HTML print', () => {
  it('builds an RTL A4 report from backend items and summary', () => {
    const parsed = parseArrearsExportResponse(rawExport);
    expect(parsed).not.toBeNull();
    if (!parsed) return;

    const html = buildArrearsPrintHtml(parsed, context);

    expect(html).toContain('<html lang="ar" dir="rtl">');
    expect(html).toContain('@page { size: A4 landscape;');
    expect(html).toContain('تقرير المتأخرات');
    expect(html).toContain('أسرة الاختبار');
    expect(html).toContain('المطلوب تحصيله الآن');
    expect(html).toContain('شيك قيد التحصيل');
    expect(html).toContain('المتأخر الأصلي');
    expect(html).not.toContain('window.print');
    expect(html).not.toContain('<button');
  });
});
