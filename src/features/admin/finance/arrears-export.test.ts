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
    overdue_accounts_count: 1,
    overdue_families_count: 1,
    total_overdue_amount: 1600,
    actionable_overdue_accounts_count: 1,
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
      includeDetails: true,
      includeContacts: true,
      filters: {
        tab: 'payment_promises',
        search: ' أسرة ',
        academicYearId: '9',
        levelId: '4',
        classId: '',
        workflowStatus: 'needs_followup',
        contactResult: '',
        assignedUserId: '',
        followupDue: 'overdue',
        pendingCheque: '',
        paymentPromise: '',
        contacted: 'no',
        actionableMin: '500',
        actionableMax: '',
        oldestAge: '',
        dueMonth: '2026-09',
        feeTypeId: '3',
      },
    });

    expect(query).toEqual({
      export: 1,
      include_details: 1,
      include_contacts: 1,
      search: 'أسرة',
      tab: 'payment_promises',
      quick: 'payment_promises',
      status: 'payment_promises',
      overdue_semantics: 'actionable',
      active_school_id: 7,
      academic_year_id: '9',
      level_id: '4',
      class_id: undefined,
      workflow_status: 'needs_followup',
      contact_result: undefined,
      assigned_user_id: undefined,
      followup_due: 'overdue',
      pending_cheque: undefined,
      payment_promise: undefined,
      contacted: 'no',
      actionable_min: '500',
      actionable_max: undefined,
      oldest_age: undefined,
      due_month: '2026-09',
      fee_type_id: '3',
    });
    expect(query).not.toHaveProperty('page');
    expect(query).not.toHaveProperty('page_size');
  });

  it('can explicitly fall back to a legacy export query', () => {
    const query = buildArrearsExportQuery({
      tab: 'all',
      activeSchoolId: 7,
      useActionable: false,
    });
    expect(query).not.toHaveProperty('overdue_semantics');
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
    expect(parsed?.summary.total_pending_cheque_coverage_on_overdue).toBe(1500);
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
  it('creates one compact six-column worksheet with numeric family total', () => {
    const detailedRaw = {
      ...rawExport,
      items: [{
        ...rawExport.items[0],
        guardians: [{
          guardian_id: 7,
          name: 'محمد',
          is_billing_partner: true,
          phone: '0611111111',
          phones: ['0611111111', '0522111111'],
          relationship_contexts: [],
        }],
        students: [{
          student_id: 11,
          student_name: 'سلمى',
          level: { display_label: 'السادس ابتدائي' },
          actionable_overdue_amount: 100,
        }],
        overdue_installments: [{
          installment_id: 91,
          student_id: 11,
          student_name: 'سلمى',
          fee_type_name: 'التمدرس',
          period_start: '2026-09-01',
          due_date: '2026-09-05',
          actionable_overdue_amount: 100,
        }],
      }],
    };
    const parsed = parseArrearsExportResponse(detailedRaw);
    expect(parsed).not.toBeNull();
    if (!parsed) return;

    const workbook = createArrearsWorkbook(parsed, context);
    expect(workbook.worksheets).toHaveLength(1);
    const worksheet = workbook.worksheets[0];
    const header = worksheet.getRow(5);
    expect(header.values).toEqual([
      undefined,
      'ولي الحساب',
      'الهواتف',
      'التلاميذ والمستويات',
      'غير المؤدى حسب الشهر',
      'متأخر التلاميذ',
      'الإجمالي',
    ]);

    const dataRow = worksheet.getRow(6);
    expect(dataRow.getCell(1).value).toBe('محمد');
    expect(String(dataRow.getCell(2).value)).toContain('0611111111');
    expect(String(dataRow.getCell(2).value)).toContain('0522111111');
    expect(String(dataRow.getCell(3).value)).toContain('السادس ابتدائي');
    expect(String(dataRow.getCell(4).value)).toContain('التمدرس');
    expect(String(dataRow.getCell(4).value)).toContain('100');
    expect(String(dataRow.getCell(5).value)).toContain('سلمى');
    expect(dataRow.getCell(6).value).toBe(100);
    expect(dataRow.getCell(6).numFmt).toBe('#,##0.00');
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
    expect(html).toContain('المطلوب الآن');
    expect(html).toContain('شيك قيد التحصيل');
    expect(html).toContain('المتأخر الأصلي');
    expect(html).not.toContain('window.print');
    expect(html).not.toContain('<button');
  });
});
