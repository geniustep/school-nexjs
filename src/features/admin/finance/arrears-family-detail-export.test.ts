import { describe, expect, it } from 'vitest';
import {
  buildArrearsExportQuery,
  createArrearsWorkbook,
  parseArrearsExportResponse,
  type ArrearsExportContext,
} from '@/features/admin/finance/arrears-export';

const context: ArrearsExportContext = {
  locale: 'en',
  generatedAt: new Date('2026-09-19T12:00:00Z'),
  schoolName: 'Test School',
  tabLabel: 'All',
};

const raw = {
  items: [{
    family_id: 41, billing_partner_id: 41, display_name: 'Family 41', student_count: 1,
    total_overdue: 1600, gross_overdue_amount: 1600,
    pending_cheque_coverage_amount: 1500, actionable_overdue_amount: 100,
    currency: { code: 'MAD' },
    guardians: [{ guardian_id: 7, partner_id: 41, name: 'Parent A', phone: '+212600000001',
      phones: ['+212600000001', '+212522000001'], is_billing_partner: true,
      relationship_contexts: [{ student_id: 11, relationship_type: 'father',
        is_primary_contact: true, is_financial_responsible: true, is_legal_guardian: true }] }],
    students: [{ student_id: 11, student_name: 'Student One', student_code: 'S001',
      class: { display_name: '1A' }, level: { display_label: 'Primary 1' },
      gross_overdue_amount: 1600, pending_cheque_coverage_amount: 1500, actionable_overdue_amount: 100 }],
    overdue_installments: [{ installment_id: 91, student_id: 11, student_name: 'Student One',
      student_code: 'S001', fee_type_name: 'Transport', period_key: '2026-09',
      period_start: '2026-09-01', period_end: '2026-09-30', due_date: '2026-09-05',
      gross_overdue_amount: 1600, pending_cheque_coverage_amount: 1500, actionable_overdue_amount: 100 }],
  }],
  summary: { overdue_accounts_count: 1, total_overdue_amount: 1600,
    actionable_overdue_accounts_count: 1, total_actionable_overdue_amount: 100,
    total_pending_cheque_coverage_on_overdue: 1500 },
  export_meta: { scope: 'all_filtered', row_count: 1, max_rows: 500, truncated: false },
};

describe('arrears detailed family export', () => {
  it('requests detailed backend payload only when requested', () => {
    expect(buildArrearsExportQuery({
      tab: 'all',
      includeDetails: true,
      includeContacts: true,
    })).toMatchObject({
      export: 1,
      include_details: 1,
      include_contacts: 1,
      overdue_semantics: 'actionable',
    });
    expect(buildArrearsExportQuery({ tab: 'all', includeDetails: false })).not.toHaveProperty('include_details');
  });

  it('creates one compact family worksheet with phones, level, service price and totals', () => {
    const parsed = parseArrearsExportResponse(raw);
    expect(parsed).not.toBeNull();
    if (!parsed) return;
    const workbook = createArrearsWorkbook(parsed, context);
    expect(workbook.worksheets).toHaveLength(1);
    const sheet = workbook.worksheets[0];
    const row = sheet.getRow(6);
    expect(row.getCell(1).value).toBe('Parent A');
    expect(String(row.getCell(2).value)).toContain('+212600000001');
    expect(String(row.getCell(2).value)).toContain('+212522000001');
    expect(String(row.getCell(3).value)).toContain('Primary 1');
    expect(String(row.getCell(4).value)).toContain('Transport');
    expect(String(row.getCell(4).value)).toContain('100');
    expect(String(row.getCell(5).value)).toContain('Student One');
    expect(row.getCell(6).value).toBe(100);
  });
});
