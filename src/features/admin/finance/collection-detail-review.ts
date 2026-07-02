import type { TranslateFn } from '@/features/i18n/locale-context';
import { collectionAllowsAction } from '@/features/admin/finance/collection-allowed-actions';
import { collectionCanReverse } from '@/features/admin/finance/collection-reverse';
import { formatFinanceMoney } from '@/lib/i18n/format-money';
import type { Locale } from '@/lib/i18n/config';
import { isChequePayment } from '@/lib/utils/cheque';
import {
  collectionState,
  currencyCode,
  paymentMethodLabel,
  refName,
} from '@/lib/utils/finance';
import { normalizeMoneyValue } from '@/lib/utils/finance-normalize';
import type {
  CollectionStatusHistoryEntry,
  FinanceCheque,
  ParentChequeInfo,
  PaymentCollection,
} from '@/types/finance';
import {
  getCollectionAllocatedAmount,
  getCollectionPayerLabel,
  getCollectionStudentCode,
  getCollectionStudentLabel,
} from './collection-normalize';

export type CollectionReviewAction =
  | 'confirm'
  | 'cancel'
  | 'open_student'
  | 'open_cheque'
  | 'view_receipt'
  | 'download_receipt';

export interface CollectionReviewActions {
  canConfirm: boolean;
  canReverseCollection: boolean;
  confirmDisabledReason: string | null;
  canViewReceipt: boolean;
  canDownloadReceipt: boolean;
  canPrintReceipt: boolean;
  canViewCheque: boolean;
  canSettleCheque: boolean;
  canRejectCheque: boolean;
  canOpenStudentFinance: boolean;
}

export interface CollectionTimelineEvent {
  key: string;
  labelKey: string;
  date: string | null;
}

export interface CollectionPartiesDisplay {
  payer: string | null;
  billingEntity: string | null;
  billingLabelKey: string;
  showPayer: boolean;
  showBilling: boolean;
  billingPartyType: string | null;
}

export interface ChequeReviewDisplay {
  fields: Array<{ key: string; label: string; value: string }>;
  settlementStatus: string | null;
  settlementLabelKey: string | null;
  postdatedBadgeKey: string | null;
  state: string | null;
}

function normalizePartyName(value: string | null | undefined): string {
  return value?.trim().toLowerCase() ?? '';
}

export function getCollectionCommercialReference(coll: PaymentCollection): string | null {
  const ref = coll.reference?.trim();
  if (ref) return ref;
  const name = coll.name?.trim();
  if (name && !name.startsWith('#')) return name;
  return null;
}

export function getCollectionUnallocatedAmount(coll: PaymentCollection): number | null {
  const fromApi = normalizeMoneyValue(coll.unallocated_amount);
  if (fromApi != null) return fromApi;
  const total = normalizeMoneyValue(coll.amount ?? coll.total_amount);
  const allocated = getCollectionAllocatedAmount(coll);
  if (total == null || allocated == null) return null;
  return Math.max(0, total - allocated);
}

export function getCollectionAcademicYearLabel(
  coll: PaymentCollection,
  academicYears?: { id: number; name: string }[],
): string | null {
  const fromRef = refName(coll.academic_year);
  if (fromRef) return fromRef;
  if (typeof coll.academic_year === 'string' && coll.academic_year.trim()) {
    return coll.academic_year.trim();
  }
  if (coll.academic_year_id && academicYears?.length) {
    const match = academicYears.find((y) => y.id === coll.academic_year_id);
    if (match?.name) return match.name;
  }
  return null;
}

export function getCollectionBillingPartyType(coll: PaymentCollection): string | null {
  const type = coll.billing_party_type?.trim();
  return type || null;
}

export function getCollectionBillingEntityLabel(coll: PaymentCollection): string | null {
  const name = coll.billing_partner_name?.trim();
  if (name) return name;
  return refName(coll.billing_partner)?.trim() || null;
}

const GENERIC_JOURNAL_NAMES = /^(banque|bank|البنك)$/i;

export function getCollectionJournalDisplayLabel(
  coll: PaymentCollection,
  t: TranslateFn,
): string | null {
  const journal = coll.journal;
  if (journal && typeof journal === 'object') {
    let name = refName(journal);
    if (name && GENERIC_JOURNAL_NAMES.test(name.trim())) {
      const localized = t('admin.finance.collections.journalBank');
      if (localized !== 'admin.finance.collections.journalBank') {
        name = localized;
      }
    }
    const code = typeof journal.code === 'string' ? journal.code.trim() : null;
    if (name && code) return `${name} — ${code}`;
    return name ?? code;
  }
  if (coll.journal_id) {
    const localized = t('admin.finance.collections.journalBank');
    return localized !== 'admin.finance.collections.journalBank'
      ? localized
      : `#${coll.journal_id}`;
  }
  return null;
}

function collectionTitleKey(coll: PaymentCollection): string {
  const status = collectionState(coll) || 'draft';
  const isCheque = isChequePayment(coll.payment_method) || !!coll.cheque;
  if (status === 'confirmed' && isCheque) {
    return 'admin.finance.collections.detail.titleConfirmedCheque';
  }
  if (status === 'draft' && isCheque) {
    return 'admin.finance.collections.detail.titleDraftCheque';
  }
  if (status === 'confirmed') {
    return 'admin.finance.collections.detail.titleConfirmed';
  }
  if (status === 'cancelled') {
    return 'admin.finance.collections.detail.titleCancelled';
  }
  if (status === 'draft') {
    return 'admin.finance.collections.detail.titleDraft';
  }
  return 'admin.finance.collections.detail.titleGeneric';
}

export function buildCollectionChequeTitleBadgeKey(coll: PaymentCollection): string | null {
  const status = collectionState(coll) || 'draft';
  if (status !== 'confirmed') return null;
  const cheque = coll.cheque as FinanceCheque | undefined;
  if (!cheque) return null;
  const settlement = cheque.settlement_status?.trim().toLowerCase();
  if (settlement === 'pending' || cheque.state === 'received' || cheque.state === 'deposited') {
    return 'admin.finance.collections.detail.chequePendingBadge';
  }
  return null;
}

export function buildCollectionDetailTitle(
  coll: PaymentCollection,
  t: TranslateFn,
  locale: Locale,
): { primary: string; secondary: string; chequeBadgeKey: string | null } {
  const primary = t(collectionTitleKey(coll));
  const amount = formatFinanceMoney(
    normalizeMoneyValue(coll.amount ?? coll.total_amount),
    currencyCode(coll.currency),
    locale,
  );
  const studentName = getCollectionStudentLabel(coll, '');
  const method = paymentMethodLabel(coll.payment_method, t);
  const secondary = studentName
    ? t('admin.finance.collections.detail.subtitleWithStudent', {
        student: studentName,
        amount,
      })
    : t('admin.finance.collections.detail.subtitleNoStudent', { method, amount });
  return {
    primary,
    secondary,
    chequeBadgeKey: buildCollectionChequeTitleBadgeKey(coll),
  };
}

export function buildCollectionStatusBannerKey(coll: PaymentCollection): string {
  const status = collectionState(coll) || 'draft';
  if (status === 'cancelled') {
    return 'admin.finance.collections.detail.statusBanner.cancelled';
  }
  if (status === 'draft') {
    return 'admin.finance.collections.detail.statusBanner.draft';
  }
  if (status === 'confirmed') {
    const cheque = coll.cheque as FinanceCheque | undefined;
    const settlement = cheque?.settlement_status?.trim().toLowerCase();
    const isCheque = isChequePayment(coll.payment_method) || !!cheque;
    if (isCheque) {
      if (settlement === 'rejected' || cheque?.state === 'rejected') {
        return 'admin.finance.collections.detail.statusBanner.chequeRejected';
      }
      if (settlement === 'settled' || cheque?.state === 'cleared') {
        return 'admin.finance.collections.detail.statusBanner.chequeSettled';
      }
      if (settlement === 'pending' || (cheque?.state && cheque.state !== 'cleared')) {
        return 'admin.finance.collections.detail.statusBanner.confirmedChequePending';
      }
    }
    return 'admin.finance.collections.detail.statusBanner.confirmedSettled';
  }
  return 'admin.finance.collections.detail.statusBanner.draft';
}

export function resolvePartiesDisplay(coll: PaymentCollection): CollectionPartiesDisplay {
  const payer = getCollectionPayerLabel(coll, '') || null;
  const billingEntity = getCollectionBillingEntityLabel(coll);
  const sameParty =
    !!payer &&
    !!billingEntity &&
    normalizePartyName(payer) === normalizePartyName(billingEntity);

  return {
    payer,
    billingEntity,
    billingLabelKey: sameParty
      ? 'admin.finance.collections.detail.billingPartyAndPayer'
      : 'admin.finance.billingPartner',
    showPayer: !!payer && !sameParty,
    showBilling: !!billingEntity,
    billingPartyType: getCollectionBillingPartyType(coll),
  };
}

export function getChequeBankDisplayName(
  cheque: FinanceCheque | ParentChequeInfo,
): string | null {
  const record = cheque as FinanceCheque;
  return (
    record.bank_display_name?.trim() ||
    cheque.bank_name?.trim() ||
    record.bank_name_snapshot?.trim() ||
    (typeof record.bank === 'string' ? record.bank.trim() : refName(record.bank as { name?: string })) ||
    null
  );
}

function resolveChequeSettlementLabelKey(cheque: FinanceCheque | ParentChequeInfo): string | null {
  const record = cheque as FinanceCheque;
  const settlement = record.settlement_status?.trim().toLowerCase();
  if (settlement) {
    const key = `admin.finance.collections.detail.chequeSettlement.${settlement}`;
    return key;
  }
  if (cheque.state_label?.trim()) return null;
  if (cheque.state) {
    return `admin.finance.cheques.states.${cheque.state}`;
  }
  return null;
}

function resolveChequePostdatedBadgeKey(
  cheque: FinanceCheque | ParentChequeInfo,
): string | null {
  const record = cheque as FinanceCheque;
  if (record.is_postdated === true) {
    return 'admin.finance.collections.detail.chequePostdatedBadge';
  }
  if (record.is_postdated === false) {
    return 'admin.finance.collections.detail.chequeNotPostdatedBadge';
  }
  const chequeDate = record.cheque_date ?? record.received_date;
  const dueDate = record.due_date ?? record.maturity_date;
  if (chequeDate && dueDate) {
    if (chequeDate < dueDate) {
      return 'admin.finance.collections.detail.chequePostdatedBadge';
    }
    if (chequeDate === dueDate) {
      return 'admin.finance.collections.detail.chequeNotPostdatedBadge';
    }
  }
  return null;
}

export function buildChequeReviewDisplay(
  cheque: FinanceCheque | ParentChequeInfo | null | undefined,
  formatDate: (value: string | null | undefined) => string,
  t: TranslateFn,
): ChequeReviewDisplay | null {
  if (!cheque) return null;

  const fields: Array<{ key: string; label: string; value: string }> = [];
  const number = cheque.cheque_number ?? (cheque as FinanceCheque).number;
  if (number) {
    fields.push({
      key: 'number',
      label: t('admin.finance.cheques.chequeNumber'),
      value: String(number),
    });
  }

  const bank = getChequeBankDisplayName(cheque);
  fields.push({
    key: 'bank',
    label: t('admin.finance.cheques.bankName'),
    value: bank ?? t('admin.finance.collections.detail.notStored'),
  });

  const holder = cheque.holder_name ?? (cheque as FinanceCheque).drawer_name;
  fields.push({
    key: 'holder',
    label: t('admin.finance.cheques.holderName'),
    value: holder?.trim() || t('admin.finance.collections.detail.notStored'),
  });

  const chequeDate = (cheque as FinanceCheque).cheque_date;
  if (chequeDate) {
    fields.push({
      key: 'chequeDate',
      label: t('admin.finance.collections.detail.chequeWrittenDate'),
      value: formatDate(chequeDate),
    });
  }

  const dueDate = cheque.due_date ?? (cheque as FinanceCheque).maturity_date;
  if (dueDate) {
    fields.push({
      key: 'dueDate',
      label: t('admin.finance.cheques.dueDate'),
      value: formatDate(dueDate),
    });
  }

  const notes =
    (cheque as FinanceCheque).public_notes ?? (cheque as { notes?: string }).notes;
  if (notes?.trim()) {
    fields.push({
      key: 'notes',
      label: t('common.note'),
      value: notes.trim(),
    });
  }

  return {
    fields,
    settlementStatus: (cheque as FinanceCheque).settlement_status ?? cheque.state ?? null,
    settlementLabelKey: resolveChequeSettlementLabelKey(cheque),
    postdatedBadgeKey: resolveChequePostdatedBadgeKey(cheque),
    state: cheque.state ?? null,
  };
}

export function resolveCollectionReviewActions(
  coll: PaymentCollection,
  options: {
    canCollect: boolean;
    t: TranslateFn;
  },
): CollectionReviewActions {
  const status = collectionState(coll) || 'draft';
  const readOnly = status === 'confirmed' || status === 'cancelled';
  const hasAllowedActions =
    Array.isArray(coll.allowed_actions) && coll.allowed_actions.length > 0
      ? true
      : !!coll.allowed_actions && typeof coll.allowed_actions === 'object';

  const canConfirmByApi = hasAllowedActions
    ? collectionAllowsAction(coll, 'confirm')
    : status === 'draft';

  let confirmDisabledReason: string | null = null;

  if (!readOnly) {
    if (!options.canCollect) {
      confirmDisabledReason = 'admin.finance.collections.detail.confirmDisabled.permission';
    } else if (!canConfirmByApi) {
      confirmDisabledReason = 'admin.finance.collections.detail.confirmDisabled.notAllowed';
    }
  }

  return {
    canConfirm: !readOnly && options.canCollect && canConfirmByApi,
    canReverseCollection: collectionCanReverse(coll),
    confirmDisabledReason,
    canViewReceipt:
      !!coll.receipt_id ||
      collectionAllowsAction(coll, 'view_receipt') ||
      collectionAllowsAction(coll, 'receipt'),
    canDownloadReceipt:
      collectionAllowsAction(coll, 'download_receipt') ||
      collectionAllowsAction(coll, 'download'),
    canPrintReceipt:
      collectionAllowsAction(coll, 'print_receipt') ||
      collectionAllowsAction(coll, 'print'),
    canViewCheque:
      !!coll.cheque?.id ||
      !!coll.cheque_id ||
      collectionAllowsAction(coll, 'view_cheque'),
    canSettleCheque: collectionAllowsAction(coll, 'settle_cheque'),
    canRejectCheque: collectionAllowsAction(coll, 'reject_cheque'),
    canOpenStudentFinance:
      collectionAllowsAction(coll, 'open_student_finance') ||
      collectionAllowsAction(coll, 'open_student'),
  };
}

const TIMELINE_EVENT_LABELS: Record<string, string> = {
  created: 'admin.finance.collections.detail.timeline.draftCreated',
  confirmed: 'admin.finance.collections.detail.timeline.confirmed',
  receipt_issued: 'admin.finance.collections.detail.timeline.receiptIssued',
  cheque_pending: 'admin.finance.collections.detail.timeline.chequePending',
  cheque_settled: 'admin.finance.collections.detail.timeline.chequeSettled',
  cheque_cleared: 'admin.finance.collections.detail.timeline.chequeCleared',
  cheque_rejected: 'admin.finance.collections.detail.timeline.chequeRejected',
  cancelled: 'admin.finance.collections.detail.timeline.cancelled',
};

function historyEntryDate(entry: CollectionStatusHistoryEntry): string | null {
  return entry.occurred_at ?? entry.date ?? null;
}

export function buildCollectionTimeline(coll: PaymentCollection): CollectionTimelineEvent[] {
  const history = coll.status_history ?? [];
  if (history.length > 0) {
    const events: CollectionTimelineEvent[] = [];
    for (const entry of history) {
      const eventKey = entry.event ?? entry.state;
      if (!eventKey) continue;
      const labelKey = TIMELINE_EVENT_LABELS[eventKey];
      if (!labelKey) continue;
      events.push({
        key: `${eventKey}-${historyEntryDate(entry) ?? events.length}`,
        labelKey,
        date: historyEntryDate(entry),
      });
    }
    if (events.length > 0) return events;
  }

  const events: CollectionTimelineEvent[] = [];
  const status = collectionState(coll) || 'draft';
  const date = coll.collection_date ?? coll.date ?? coll.payment_date ?? null;

  if (status === 'draft' || status === 'confirmed' || status === 'cancelled') {
    events.push({
      key: 'draft',
      labelKey: 'admin.finance.collections.detail.timeline.draftCreated',
      date,
    });
  }

  if (status === 'confirmed') {
    events.push({
      key: 'confirmed',
      labelKey: 'admin.finance.collections.detail.timeline.confirmed',
      date,
    });
  }

  if (
    coll.receipt_id ||
    (typeof coll.receipt_number === 'string' && coll.receipt_number.trim())
  ) {
    events.push({
      key: 'receipt',
      labelKey: 'admin.finance.collections.detail.timeline.receiptIssued',
      date: null,
    });
  }

  const cheque = coll.cheque;
  if (cheque?.cleared_date || cheque?.state === 'cleared') {
    events.push({
      key: 'cheque_cleared',
      labelKey: 'admin.finance.collections.detail.timeline.chequeCleared',
      date: cheque.cleared_date ?? null,
    });
  } else if (
    isChequePayment(coll.payment_method) &&
    status === 'confirmed' &&
    cheque?.state &&
    cheque.state !== 'cleared'
  ) {
    events.push({
      key: 'cheque_pending',
      labelKey: 'admin.finance.collections.detail.timeline.chequePending',
      date: null,
    });
  }

  if (status === 'cancelled') {
    events.push({
      key: 'cancelled',
      labelKey: 'admin.finance.collections.detail.timeline.cancelled',
      date,
    });
  }

  return events;
}

export function resolveStudentUnavailableReason(coll: PaymentCollection): string | null {
  const hasStudentId = !!(coll.student_id ?? coll.student?.id);
  const hasName = !!getCollectionStudentLabel(coll, '').trim();
  if (!hasStudentId) return 'admin.finance.collections.detail.studentMissing';
  if (!hasName) return 'admin.finance.collections.detail.studentOutOfScope';
  return null;
}

export function getCollectionReceiptLabel(coll: PaymentCollection, t: TranslateFn): string {
  const number = coll.receipt_number;
  if (typeof number === 'string' && number.trim()) return number.trim();
  if (coll.receipt_id) return `#${coll.receipt_id}`;
  return t('admin.finance.collections.detail.receiptNotIssued');
}

export {
  getCollectionStudentLabel,
  getCollectionStudentCode,
  getCollectionPayerLabel,
  getCollectionAllocatedAmount,
};
