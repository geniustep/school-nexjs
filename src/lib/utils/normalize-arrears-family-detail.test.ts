import { describe, expect, it } from 'vitest';
import { normalizeArrearsFamilyFollowupDetail } from '@/lib/utils/normalize-arrears';

describe('arrears family detail normalization', () => {
  it('preserves guardians, students and overdue service details', () => {
    const detail = normalizeArrearsFamilyFollowupDetail({
      family_id: 41,
      display_name: 'Family 41',
      guardians: [
        { guardian_id: 7, partner_id: 41, name: 'Parent A', is_billing_partner: true,
          relationship_contexts: [{ student_id: 11, relationship_type: 'father', is_primary_contact: true, is_financial_responsible: true, is_legal_guardian: true }] },
        { guardian_id: 8, partner_id: 42, name: 'Parent B', is_billing_partner: false,
          relationship_contexts: [{ student_id: 11, relationship_type: 'mother', is_legal_guardian: true }] },
      ],
      students: [{ student_id: 11, student_name: 'Student One', student_code: 'S001', class: { display_name: '1A' }, level: { display_label: 'Primary 1' }, gross_overdue_amount: 1600, pending_cheque_coverage_amount: 1500, actionable_overdue_amount: 100 }],
      overdue_installments: [{ installment_id: 91, student_id: 11, student_name: 'Student One', student_code: 'S001', fee_type_name: 'Transport', period_key: '2026-09', due_date: '2026-09-05', gross_overdue_amount: 1600, pending_cheque_coverage_amount: 1500, actionable_overdue_amount: 100 }],
    });
    expect(detail?.guardians).toHaveLength(2);
    expect(detail?.guardians?.[1].name).toBe('Parent B');
    expect(detail?.students?.[0].student_code).toBe('S001');
    expect(detail?.overdue_installments?.[0].fee_type_name).toBe('Transport');
  });
});
