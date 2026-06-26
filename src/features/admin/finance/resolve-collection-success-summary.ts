import {
  getCollectionAllocatedAmount,
  getCollectionJournalLabel,
} from '@/features/admin/finance/collection-normalize';
import { normalizeMoneyValue } from '@/lib/utils/finance-normalize';
import type { PaymentCollection } from '@/types/finance';
import type { CreatePaymentCollectionResponse } from '@/types/student-financial-overview';

export interface CollectionSuccessFallback {
  amount?: number | null;
  paymentMethod?: string | null;
  journalLabel?: string | null;
  receiptNumber?: string | null;
  receiptId?: number | null;
}

export interface CollectionSuccessSummaryField {
  key: string;
  labelKey: string;
  value: string;
  moneyAmount?: number | null;
  currency?: string | null;
  emphasize?: boolean;
}

export interface CollectionSuccessSummary {
  receiptNumber: string | null;
  receiptId: number | null;
  collectionId: number | null;
  amount: number | null;
  currency: string | null;
  paymentMethodCode: string | null;
  journalLabel: string | null;
  referenceLabel: string | null;
  allocationCount: number;
  allocatedAmount: number | null;
  unallocatedAmount: number | null;
  fields: CollectionSuccessSummaryField[];
}

function readMoney(value: unknown): number | null {
  return normalizeMoneyValue(value);
}

export function isInvalidDisplayToken(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === 'number' && !Number.isFinite(value)) return true;
  const text = String(value).trim();
  if (!text) return true;
  const lower = text.toLowerCase();
  if (lower === 'undefined' || lower === 'null' || lower === 'nan') return true;
  if (lower === '#undefined' || lower === 'undefined#') return true;
  if (/^#?undefined#?$/i.test(text)) return true;
  return false;
}

export function resolveCollectionReceiptNumber(
  collection: PaymentCollection,
  extras?: Pick<CollectionSuccessFallback, 'receiptNumber' | 'receiptId'>,
): { receiptNumber: string | null; receiptId: number | null } {
  const receiptNumberRaw =
    extras?.receiptNumber ??
    collection.receipt_number ??
    (collection as { receipt?: { number?: string; receipt_number?: string } }).receipt?.number ??
    (collection as { receipt?: { receipt_number?: string } }).receipt?.receipt_number;
  const receiptNumber =
    typeof receiptNumberRaw === 'string' && !isInvalidDisplayToken(receiptNumberRaw)
      ? receiptNumberRaw.trim()
      : null;

  const receiptIdRaw =
    extras?.receiptId ??
    collection.receipt_id ??
    (collection as { receipt?: { id?: number } }).receipt?.id;
  const receiptId =
    typeof receiptIdRaw === 'number' && Number.isFinite(receiptIdRaw) ? receiptIdRaw : null;

  return { receiptNumber, receiptId };
}

export function resolveCollectionSuccessAmount(
  collection: PaymentCollection,
  fallback?: CollectionSuccessFallback,
): number | null {
  const fromCollection = readMoney(
    collection.amount ??
      collection.total_amount ??
      collection.collection_amount ??
      (collection as { collectionAmount?: unknown }).collectionAmount,
  );
  if (fromCollection != null && fromCollection > 0) return fromCollection;

  const fromFallback = readMoney(fallback?.amount);
  if (fromFallback != null && fromFallback > 0) return fromFallback;

  const allocated = getCollectionAllocatedAmount(collection);
  if (allocated != null && allocated > 0) return allocated;

  return null;
}

export function resolveCollectionSuccessPaymentMethod(
  collection: PaymentCollection,
  fallback?: CollectionSuccessFallback,
): string | null {
  const methodRaw = collection.payment_method as
    | string
    | { code?: string; name?: string; label?: string }
    | null
    | undefined;
  const fromCollection =
    typeof methodRaw === 'string'
      ? methodRaw
      : methodRaw && typeof methodRaw === 'object'
        ? methodRaw.code ?? methodRaw.name ?? methodRaw.label ?? null
        : null;
  if (fromCollection && !isInvalidDisplayToken(fromCollection)) return fromCollection;

  const fromFallback = fallback?.paymentMethod?.trim();
  if (fromFallback && !isInvalidDisplayToken(fromFallback)) return fromFallback;

  return null;
}

export function resolveCollectionReferenceLabel(
  collection: PaymentCollection,
  receiptNumber: string | null,
): string | null {
  if (receiptNumber) return null;

  const reference = collection.reference?.trim();
  if (reference && !isInvalidDisplayToken(reference)) return reference;

  const name = collection.name?.trim();
  if (name && !isInvalidDisplayToken(name)) return name;

  if (typeof collection.id === 'number' && Number.isFinite(collection.id)) {
    return `Collection #${collection.id}`;
  }

  return null;
}

export function resolveCollectionSuccessSummary(
  collection: PaymentCollection,
  fallback?: CollectionSuccessFallback,
): CollectionSuccessSummary {
  const { receiptNumber, receiptId } = resolveCollectionReceiptNumber(collection, fallback);
  const amount = resolveCollectionSuccessAmount(collection, fallback);
  const paymentMethodCode = resolveCollectionSuccessPaymentMethod(collection, fallback);
  const journalLabel =
    fallback?.journalLabel?.trim() ||
    getCollectionJournalLabel(collection) ||
    null;
  const referenceLabel = resolveCollectionReferenceLabel(collection, receiptNumber);

  const allocatedAmount = getCollectionAllocatedAmount(collection);
  const unallocatedRaw = readMoney(collection.unallocated_amount);
  const unallocatedAmount =
    unallocatedRaw != null
      ? unallocatedRaw
      : amount != null && allocatedAmount != null
        ? Math.max(0, amount - allocatedAmount)
        : null;

  const allocationCount =
    collection.allocation_count ??
    collection.allocations?.length ??
    0;

  const currency =
    typeof collection.currency === 'string' && collection.currency.trim()
      ? collection.currency
      : null;

  const collectionId =
    typeof collection.id === 'number' && Number.isFinite(collection.id) ? collection.id : null;

  const fields: CollectionSuccessSummaryField[] = [];

  if (amount != null) {
    fields.push({
      key: 'amount',
      labelKey: 'admin.finance.collectionAmount',
      value: '',
      moneyAmount: amount,
      currency,
    });
  }

  if (paymentMethodCode) {
    fields.push({
      key: 'paymentMethod',
      labelKey: 'admin.finance.paymentMethod',
      value: paymentMethodCode,
    });
  }

  if (journalLabel) {
    fields.push({
      key: 'journal',
      labelKey: 'admin.finance.paymentJournal',
      value: journalLabel,
    });
  }

  if (referenceLabel) {
    fields.push({
      key: 'reference',
      labelKey: 'admin.finance.reference',
      value: referenceLabel,
    });
  }

  if (allocationCount > 0) {
    fields.push({
      key: 'allocationCount',
      labelKey: 'admin.finance.collectionWorkflow.allocationsCount',
      value: String(allocationCount),
    });
  }

  if (allocatedAmount != null) {
    fields.push({
      key: 'allocated',
      labelKey: 'admin.finance.collectionWorkflow.allocatedAmount',
      value: '',
      moneyAmount: allocatedAmount,
      currency,
    });
  }

  if (unallocatedAmount != null) {
    fields.push({
      key: 'unallocated',
      labelKey: 'admin.finance.collectionWorkflow.unallocatedAmount',
      value: '',
      moneyAmount: unallocatedAmount,
      currency,
    });
  }

  return {
    receiptNumber,
    receiptId,
    collectionId,
    amount,
    currency,
    paymentMethodCode,
    journalLabel,
    referenceLabel,
    allocationCount,
    allocatedAmount,
    unallocatedAmount,
    fields,
  };
}

export function mergeCreateCollectionResponse(
  body: CreatePaymentCollectionResponse | PaymentCollection,
): {
  collection: PaymentCollection;
  fallback: CollectionSuccessFallback;
} {
  if (body && typeof body === 'object' && 'collection' in body) {
    const wrapped = body as CreatePaymentCollectionResponse;
    return {
      collection: wrapped.collection,
      fallback: {
        receiptNumber: wrapped.receipt_number ?? wrapped.collection.receipt_number ?? null,
        receiptId: wrapped.receipt_id ?? wrapped.collection.receipt_id ?? null,
      },
    };
  }
  return { collection: body as PaymentCollection, fallback: {} };
}
