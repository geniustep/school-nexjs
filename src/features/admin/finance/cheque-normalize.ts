import { financeStudentDisplayName, refName } from '@/lib/utils/finance';
import { normalizeMoneyValue } from '@/lib/utils/finance-normalize';
import { isRejectedCheque, normalizeChequeStatus } from '@/lib/utils/cheque-status';
import type { ChequeLifecycleAction } from '@/lib/utils/cheque';
import type { FinanceCheque } from '@/types/finance';

export type ChequeTitleTone = 'pending' | 'deposited' | 'cleared' | 'rejected' | 'cancelled';

export interface ChequeLifecycleEvent {
  id: string;
  date: string | null;
  state: string;
  titleKey: string;
  description?: string | null;
  reason?: string | null;
}

export function getChequeDisplayNumber(cheque: FinanceCheque): string {
  return (
    cheque.cheque_number?.trim() ||
    cheque.number?.trim() ||
    (cheque.id ? `#${cheque.id}` : '')
  );
}

export function getChequeBankLabel(cheque: FinanceCheque): string | null {
  const bank = cheque.bank_name?.trim() || cheque.bank_name_snapshot?.trim();
  if (bank) return bank;
  if (typeof cheque.bank === 'string' && cheque.bank.trim()) return cheque.bank.trim();
  return refName(typeof cheque.bank === 'object' ? cheque.bank : null)?.trim() || null;
}

export function getChequePayerLabel(cheque: FinanceCheque): string | null {
  return (
    refName(cheque.payer)?.trim() ||
    cheque.holder_name?.trim() ||
    cheque.drawer_name?.trim() ||
    null
  );
}

export function getChequeStudentLabel(cheque: FinanceCheque): string | null {
  const fromApi = cheque.student_name?.trim();
  if (fromApi) return fromApi;
  const nested = financeStudentDisplayName({
    name: typeof cheque.student?.name === 'string' ? cheque.student.name : undefined,
    full_name: typeof cheque.student?.full_name === 'string' ? cheque.student.full_name : undefined,
  });
  return nested !== '—' ? nested : null;
}

export function getChequeStudentCode(cheque: FinanceCheque): string | null {
  const student = cheque.student;
  return student?.code?.trim() || student?.school_number?.trim() || null;
}

export function getChequeSchoolLabel(cheque: FinanceCheque): string | null {
  return refName(cheque.school)?.trim() || null;
}

export function getChequeRejectionReason(cheque: FinanceCheque): string | null {
  return (
    cheque.bounce_reason?.trim() ||
    cheque.rejection_reason?.trim() ||
    cheque.return_reason?.trim() ||
    null
  );
}

export function getChequeTitleTone(cheque: FinanceCheque): ChequeTitleTone {
  const bucket = normalizeChequeStatus(cheque.state);
  if (bucket === 'deposited') return 'deposited';
  if (bucket === 'cleared') return 'cleared';
  if (bucket === 'cancelled') return 'cancelled';
  if (isRejectedCheque(cheque.state)) return 'rejected';
  return 'pending';
}

export function getChequeTitleKey(cheque: FinanceCheque): string {
  return `admin.finance.cheques.details.title.${getChequeTitleTone(cheque)}`;
}

export function getReversedAllocationCount(cheque: FinanceCheque): number {
  return (cheque.allocations ?? []).filter((row) => {
    const state = `${row.settlement_state ?? ''} ${row.state ?? ''}`.toLowerCase();
    return state.includes('revers') || state.includes('cancel');
  }).length;
}

export function buildChequeLifecycleEvents(cheque: FinanceCheque): ChequeLifecycleEvent[] {
  const CHEQUE_TIMELINE_EVENT_LABELS: Record<string, string> = {
    received: 'admin.finance.cheques.details.timeline.received',
    deposited: 'admin.finance.cheques.details.timeline.deposited',
    cheque_settled: 'admin.finance.cheques.details.timeline.chequeSettled',
    cleared: 'admin.finance.cheques.details.timeline.cleared',
    cheque_rejected: 'admin.finance.cheques.details.timeline.chequeRejected',
    rejected: 'admin.finance.cheques.details.timeline.rejected',
    cancelled: 'admin.finance.cheques.details.timeline.cancelled',
    reversal: 'admin.finance.cheques.details.timeline.reversal',
  };

  const history = cheque.status_history ?? [];
  if (history.length > 0) {
    const events: ChequeLifecycleEvent[] = [];
    for (const entry of history) {
      const eventKey = entry.event ?? entry.state;
      if (!eventKey) continue;
      const titleKey = CHEQUE_TIMELINE_EVENT_LABELS[eventKey];
      if (!titleKey) continue;
      let reason: string | null = null;
      if (eventKey === 'cheque_rejected' && entry.metadata && typeof entry.metadata === 'object') {
        const meta = entry.metadata as Record<string, unknown>;
        reason =
          (typeof meta.reason === 'string' ? meta.reason : null) ??
          (typeof meta.rejection_reason === 'string' ? meta.rejection_reason : null);
      }
      events.push({
        id: eventKey,
        date: entry.occurred_at ?? entry.date ?? null,
        state: eventKey,
        titleKey,
        reason,
      });
    }
    if (events.length > 0) {
      return events.sort((a, b) => {
        if (!a.date && !b.date) return 0;
        if (!a.date) return 1;
        if (!b.date) return -1;
        return a.date.localeCompare(b.date);
      });
    }
  }

  const events: ChequeLifecycleEvent[] = [];
  const bucket = normalizeChequeStatus(cheque.state);
  const rejectionReason = getChequeRejectionReason(cheque);

  if (cheque.received_date) {
    events.push({
      id: 'received',
      date: cheque.received_date,
      state: 'received',
      titleKey: 'admin.finance.cheques.details.timeline.received',
    });
  }

  const dueDate = cheque.due_date ?? cheque.maturity_date ?? null;
  if (dueDate) {
    events.push({
      id: 'due',
      date: dueDate,
      state: 'due',
      titleKey: 'admin.finance.cheques.details.timeline.dueDate',
    });
  }

  const depositedDate = cheque.deposited_date ?? cheque.deposit_date ?? null;
  if (depositedDate) {
    events.push({
      id: 'deposited',
      date: depositedDate,
      state: 'deposited',
      titleKey: 'admin.finance.cheques.details.timeline.deposited',
    });
  }

  if (cheque.cleared_date) {
    events.push({
      id: 'cleared',
      date: cheque.cleared_date,
      state: 'cleared',
      titleKey: 'admin.finance.cheques.details.timeline.cleared',
    });
  }

  const rejectedDate = cheque.bounced_date ?? cheque.rejected_date ?? cheque.returned_date ?? null;
  if (rejectedDate && isRejectedCheque(cheque.state)) {
    events.push({
      id: 'rejected',
      date: rejectedDate,
      state: 'rejected',
      titleKey: 'admin.finance.cheques.details.timeline.rejected',
      reason: rejectionReason,
    });
  }

  if (cheque.cancelled_date && bucket === 'cancelled') {
    events.push({
      id: 'cancelled',
      date: cheque.cancelled_date,
      state: 'cancelled',
      titleKey: 'admin.finance.cheques.details.timeline.cancelled',
      reason: cheque.cancellation_reason?.trim() || null,
    });
  }

  if (cheque.reversal_applied && rejectedDate) {
    events.push({
      id: 'reversal',
      date: rejectedDate,
      state: 'reversal',
      titleKey: 'admin.finance.cheques.details.timeline.reversal',
    });
  }

  return events.sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return a.date.localeCompare(b.date);
  });
}

const CHEQUE_API_ACTION_TO_TRANSITION: Record<string, ChequeLifecycleAction | string> = {
  deposit: 'deposit',
  settle: 'settle',
  clear: 'settle',
  bounce: 'reject',
  reject: 'reject',
  cancel: 'cancel',
};

function mapChequeApiActions(actions: string[]): ChequeLifecycleAction[] {
  const mapped = new Set<ChequeLifecycleAction>();
  for (const action of actions) {
    const normalized = action.trim().toLowerCase();
    const transition = CHEQUE_API_ACTION_TO_TRANSITION[normalized] ?? normalized;
    if (transition === 'deposit' || transition === 'settle' || transition === 'reject' || transition === 'cancel') {
      mapped.add(transition);
    }
  }
  return [...mapped];
}

export function normalizeChequeAllowedActions(
  raw: FinanceCheque['allowed_actions'] | null | undefined,
  actionCodes?: string[] | null,
): ChequeLifecycleAction[] {
  const hasMap = !!raw && typeof raw === 'object' && !Array.isArray(raw);
  if (hasMap) {
    return mapChequeApiActions(
      Object.keys(raw).filter((key) => {
        const value = (raw as Record<string, unknown>)[key];
        return value === true || (typeof value === 'number' && value > 0);
      }),
    );
  }
  if (Array.isArray(raw) && raw.length) return mapChequeApiActions(raw);
  if (Array.isArray(actionCodes) && actionCodes.length) return mapChequeApiActions(actionCodes);
  return [];
}

export function normalizeChequeDetail(cheque: FinanceCheque) {
  return {
    id: cheque.id,
    displayNumber: getChequeDisplayNumber(cheque),
    bank: getChequeBankLabel(cheque),
    payer: getChequePayerLabel(cheque),
    studentName: getChequeStudentLabel(cheque),
    studentCode: getChequeStudentCode(cheque),
    studentId: cheque.student_id ?? cheque.student?.id ?? null,
    school: getChequeSchoolLabel(cheque),
    amount: normalizeMoneyValue(cheque.amount),
    currency: cheque.currency,
    state: normalizeChequeStatus(cheque.state),
    stateLabel: cheque.state_label?.trim() || null,
    rejectionReason: getChequeRejectionReason(cheque),
    reversalApplied: cheque.reversal_applied === true,
    reversedAllocations: getReversedAllocationCount(cheque),
    collectionId: cheque.collection_id ?? null,
    allowedActions: normalizeChequeAllowedActions(cheque.allowed_actions, cheque.allowed_action_codes),
    titleKey: getChequeTitleKey(cheque),
    titleTone: getChequeTitleTone(cheque),
    timeline: buildChequeLifecycleEvents(cheque),
    raw: cheque,
  };
}

export type NormalizedChequeDetail = ReturnType<typeof normalizeChequeDetail>;

/** Prefer API allowed_actions; fall back to state-machine transitions when absent. */
export function resolveChequeAllowedTransitions(cheque: FinanceCheque): string[] {
  const fromApi = normalizeChequeAllowedActions(cheque.allowed_actions, cheque.allowed_action_codes);
  if (fromApi.length) {
    return fromApi.filter((action): action is ChequeLifecycleAction =>
      ['deposit', 'settle', 'reject', 'cancel'].includes(action),
    );
  }
  return [];
}
