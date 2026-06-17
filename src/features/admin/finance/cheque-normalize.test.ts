import { describe, expect, it } from 'vitest';
import {
  buildChequeLifecycleEvents,
  getChequeDisplayNumber,
  getChequePayerLabel,
  getChequeRejectionReason,
  getChequeSchoolLabel,
  getChequeStudentLabel,
  getChequeTitleKey,
  getChequeTitleTone,
  getReversedAllocationCount,
  normalizeChequeDetail,
} from './cheque-normalize';
import type { FinanceCheque } from '@/types/finance';

const sample310: FinanceCheque = {
  id: 310,
  number: 'QA CHEQUE LIFECYCLE-BOUNCED-500.0',
  cheque_number: 'QA CHEQUE LIFECYCLE-BOUNCED-500.0',
  student_id: 822,
  student_name: 'Bulk Success',
  payer: { id: 6988, name: 'QA FIN Billing Partner 822' },
  holder_name: 'QA FIN Billing Partner 822',
  bank_name: 'QA Bank Lifecycle',
  amount: 500,
  currency: { name: 'MAD', symbol: 'DH' },
  received_date: '2026-06-01',
  due_date: '2026-07-15',
  bounced_date: '2026-07-16',
  rejected_date: '2026-07-16',
  state: 'bounced',
  state_label: 'مرفوض',
  bounce_reason: 'NSF QA',
  rejection_reason: 'NSF QA',
  reversal_applied: true,
  collection_id: 635,
  allowed_actions: ['return', 'replace'],
  allocations: [{ id: 1, amount: 500, settlement_state: 'reversed', state: 'cancelled' }],
};

describe('cheque normalize', () => {
  it('maps student and payer from API fields', () => {
    expect(getChequeStudentLabel(sample310)).toBe('Bulk Success');
    expect(getChequePayerLabel(sample310)).toBe('QA FIN Billing Partner 822');
    expect(getChequeDisplayNumber(sample310)).toBe('QA CHEQUE LIFECYCLE-BOUNCED-500.0');
  });

  it('does not expose missing school as technical key', () => {
    expect(getChequeSchoolLabel(sample310)).toBeNull();
  });

  it('uses bounced state for rejected title tone', () => {
    expect(getChequeTitleTone(sample310)).toBe('rejected');
    expect(getChequeTitleKey(sample310)).toContain('rejected');
  });

  it('reads rejection reason from bounce_reason', () => {
    expect(getChequeRejectionReason(sample310)).toBe('NSF QA');
  });

  it('builds chronological timeline with rejection and reversal', () => {
    const events = buildChequeLifecycleEvents(sample310);
    expect(events.map((e) => e.id)).toEqual(['received', 'due', 'rejected', 'reversal']);
    expect(events.find((e) => e.id === 'rejected')?.reason).toBe('NSF QA');
  });

  it('counts reversed allocations', () => {
    expect(getReversedAllocationCount(sample310)).toBe(1);
  });

  it('normalizes detail view model', () => {
    const detail = normalizeChequeDetail(sample310);
    expect(detail.studentId).toBe(822);
    expect(detail.collectionId).toBe(635);
    expect(detail.reversalApplied).toBe(true);
    expect(detail.allowedActions).toEqual([]);
  });

  it('normalizes allowed_actions map from API', () => {
    const detail = normalizeChequeDetail({
      ...sample310,
      allowed_actions: { deposit: true, clear: false, return: true },
    } as FinanceCheque);
    expect(detail.allowedActions).toEqual(['deposit']);
  });

  it('maps allowed_action_codes to UI transition actions', () => {
    const detail = normalizeChequeDetail({
      ...sample310,
      allowed_actions: { view: true, settle: true, reject: true, cancel: true },
      allowed_action_codes: ['deposit', 'bounce', 'settle', 'reject', 'cancel'],
    } as FinanceCheque);
    expect(detail.allowedActions.sort()).toEqual(['cancel', 'reject', 'settle']);
  });

  it('builds timeline from official status_history', () => {
    const events = buildChequeLifecycleEvents({
      ...sample310,
      state: 'cleared',
      settlement_status: 'settled',
      status_history: [
        { event: 'received', occurred_at: '2026-06-01' },
        { event: 'cheque_settled', occurred_at: '2026-06-18' },
      ],
    } as FinanceCheque);
    expect(events.map((e) => e.id)).toEqual(['received', 'cheque_settled']);
    expect(events[1]?.titleKey).toBe('admin.finance.cheques.details.timeline.chequeSettled');
  });

  it('shows rejection reason from status_history metadata', () => {
    const events = buildChequeLifecycleEvents({
      ...sample310,
      status_history: [
        {
          event: 'cheque_rejected',
          occurred_at: '2026-07-16',
          metadata: { reason_code: 'insufficient_funds', reason: 'NSF QA' },
        },
      ],
    } as FinanceCheque);
    expect(events[0]?.reason).toBe('NSF QA');
  });
});
