import type { TranslateFn } from '@/features/i18n/locale-context';
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
import type { FinanceCheque, ParentChequeInfo, PaymentCollection } from '@/types/finance';
import {
  getCollectionAllocatedAmount,
  getCollectionPayerLabel,
  getCollectionStudentCode,
  getCollectionStudentLabel,
} from './collection-normalize';

export type CollectionReviewAction = 'confirm' | 'cancel' | 'open_student' | 'open_cheque';

export interface CollectionReviewActions {
  canConfirm: boolean;
  canCancel: boolean;
  confirmDisabledReason: string | null;
  cancelDisabledReason: string | null;
}

export interface CollectionTimelineEvent {
  key: string;
  labelKey: string;
  date: string | null;
}

function collectionAllowsAction(coll: PaymentCollection, action: string): boolean {
  const allowed = coll.allowed_actions;
  if (allowed?.length) return allowed.includes(action);
  return false;
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

export function buildCollectionDetailTitle(
  coll: PaymentCollection,
  t: TranslateFn,
  locale: Locale,
): { primary: string; secondary: string } {
  const status = collectionState(coll) || 'draft';
  const statusLabel = t(`admin.finance.states.${status}`);
  const method = paymentMethodLabel(coll.payment_method, t);
  const primary = t('admin.finance.collections.detail.titlePattern', {
    status: statusLabel === `admin.finance.states.${status}` ? status : statusLabel,
    method,
  });
  const amount = formatFinanceMoney(
    normalizeMoneyValue(coll.amount ?? coll.total_amount),
    currencyCode(coll.currency),
    locale,
  );
  const studentName = getCollectionStudentLabel(coll, '');
  const secondary = studentName
    ? t('admin.finance.collections.detail.subtitleWithStudent', {
        student: studentName,
        amount,
      })
    : t('admin.finance.collections.detail.subtitleNoStudent', { method, amount });
  return { primary, secondary };
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
    const cheque = coll.cheque;
    const chequeState = cheque?.state;
    const isCheque = isChequePayment(coll.payment_method) || !!cheque;
    if (isCheque && chequeState && chequeState !== 'cleared') {
      return 'admin.finance.collections.detail.statusBanner.confirmedChequePending';
    }
    return 'admin.finance.collections.detail.statusBanner.confirmedSettled';
  }
  return 'admin.finance.collections.detail.statusBanner.draft';
}

export function resolveCollectionReviewActions(
  coll: PaymentCollection,
  options: {
    canCollect: boolean;
    canCancel: boolean;
    t: TranslateFn;
  },
): CollectionReviewActions {
  const status = collectionState(coll) || 'draft';
  const readOnly = status === 'confirmed' || status === 'cancelled';
  const hasAllowedActions = (coll.allowed_actions?.length ?? 0) > 0;
  const canConfirmByApi = hasAllowedActions
    ? collectionAllowsAction(coll, 'confirm')
    : status === 'draft';
  const canCancelByApi = hasAllowedActions
    ? collectionAllowsAction(coll, 'cancel')
    : status === 'draft';

  let confirmDisabledReason: string | null = null;
  let cancelDisabledReason: string | null = null;

  if (!readOnly) {
    if (!options.canCollect) {
      confirmDisabledReason = 'admin.finance.collections.detail.confirmDisabled.permission';
    } else if (!canConfirmByApi) {
      confirmDisabledReason = 'admin.finance.collections.detail.confirmDisabled.notAllowed';
    }
    if (!options.canCancel) {
      cancelDisabledReason = 'admin.finance.collections.detail.cancelDisabled.permission';
    } else if (!canCancelByApi) {
      cancelDisabledReason = 'admin.finance.collections.detail.cancelDisabled.notAllowed';
    }
  }

  return {
    canConfirm: !readOnly && options.canCollect && canConfirmByApi,
    canCancel: !readOnly && options.canCancel && canCancelByApi,
    confirmDisabledReason,
    cancelDisabledReason,
  };
}

export function buildCollectionTimeline(
  coll: PaymentCollection,
): CollectionTimelineEvent[] {
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

  const history = coll.status_history ?? [];
  for (const entry of history) {
    const state = entry.state;
    if (state === 'confirmed') {
      events.push({
        key: 'confirmed',
        labelKey: 'admin.finance.collections.detail.timeline.confirmed',
        date: entry.date ?? null,
      });
    }
    if (state === 'cancelled') {
      events.push({
        key: 'cancelled',
        labelKey: 'admin.finance.collections.detail.timeline.cancelled',
        date: entry.date ?? null,
      });
    }
  }

  if (status === 'confirmed' && !events.some((e) => e.key === 'confirmed')) {
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
  }

  if (status === 'cancelled' && !events.some((e) => e.key === 'cancelled')) {
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

export function extractChequeReviewFields(
  cheque: FinanceCheque | ParentChequeInfo | null | undefined,
  formatDate: (value: string | null | undefined) => string,
  t: TranslateFn,
): Array<{ label: string; value: string }> {
  if (!cheque) return [];
  const fields: Array<{ label: string; value: string }> = [];
  const number = cheque.cheque_number ?? (cheque as FinanceCheque).number;
  if (number) {
    fields.push({
      label: t('admin.finance.cheques.number'),
      value: String(number),
    });
  }
  const chequeRecord = cheque as FinanceCheque;
  const bank =
    cheque.bank_name ??
    chequeRecord.bank_name_snapshot ??
    (typeof chequeRecord.bank === 'string' ? chequeRecord.bank : refName(chequeRecord.bank as { name?: string }));
  if (bank) {
    fields.push({ label: t('admin.finance.cheques.bankName'), value: bank });
  }
  const holder = cheque.holder_name ?? (cheque as FinanceCheque).drawer_name;
  if (holder) {
    fields.push({ label: t('admin.finance.cheques.holderName'), value: holder });
  }
  const chequeDate = (cheque as FinanceCheque).cheque_date;
  if (chequeDate) {
    fields.push({
      label: t('admin.finance.collections.detail.chequeWrittenDate'),
      value: formatDate(chequeDate),
    });
  }
  const dueDate = cheque.due_date ?? (cheque as FinanceCheque).maturity_date;
  if (dueDate) {
    fields.push({
      label: t('admin.finance.cheques.dueDate'),
      value: formatDate(dueDate),
    });
  }
  const isPostdated = (cheque as FinanceCheque & { is_postdated?: boolean }).is_postdated;
  if (isPostdated != null) {
    fields.push({
      label: t('admin.finance.collections.detail.chequePostdated'),
      value: isPostdated
        ? t('common.yes')
        : t('common.no'),
    });
  }
  if (cheque.state || cheque.state_label) {
    fields.push({
      label: t('admin.finance.cheques.status'),
      value: cheque.state_label ?? String(cheque.state),
    });
  }
  const notes = (cheque as FinanceCheque).public_notes ?? (cheque as { notes?: string }).notes;
  if (notes?.trim()) {
    fields.push({ label: t('common.note'), value: notes.trim() });
  }
  return fields;
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
