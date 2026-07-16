import { normalizeMoneyValue, parseFinanceList } from '@/lib/utils/finance-normalize';
import type {
  FinanceReceipt,
  FinanceReceiptAllocation,
  FinanceReceiptCheque,
  FinanceReceiptChildBreakdown,
  FinanceReceiptSnapshot,
  FinanceReceiptTotals,
} from '@/types/finance';

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function normalizeStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.filter((item): item is string => typeof item === 'string');
}

function normalizeNumberId(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isInteger(value)) return value;
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) return Number(value.trim());
  return undefined;
}

/** Preserve order; drop non-numeric entries without throwing. */
function normalizeInvolvedStudentIds(value: unknown): number[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const ids: number[] = [];
  for (const item of value) {
    const id = normalizeNumberId(item);
    if (id != null) ids.push(id);
  }
  return ids.length ? ids : undefined;
}

function resolveChildrenCount(
  rawCount: unknown,
  children: FinanceReceiptChildBreakdown[] | undefined,
): number | undefined {
  if (typeof rawCount === 'number' && Number.isFinite(rawCount)) return rawCount;
  if (children?.length) return children.length;
  return undefined;
}

function resolveIsMultiStudent(options: {
  flag?: unknown;
  snapshotFlag?: boolean;
  childrenCount?: number;
  childrenLength?: number;
}): boolean | undefined {
  if (options.flag === true || options.snapshotFlag === true) return true;
  const count = options.childrenCount ?? options.childrenLength ?? 0;
  if (count > 1) return true;
  return undefined;
}

function normalizeCheque(raw: unknown): FinanceReceiptCheque | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const source = raw as Record<string, unknown>;
  return {
    id: typeof source.id === 'number' ? source.id : undefined,
    number: typeof source.number === 'string' ? source.number : undefined,
    bank_name: typeof source.bank_name === 'string' ? source.bank_name : undefined,
    drawer_name: typeof source.drawer_name === 'string' ? source.drawer_name : undefined,
    holder_name: typeof source.holder_name === 'string' ? source.holder_name : undefined,
    maturity_date: typeof source.maturity_date === 'string' ? source.maturity_date : null,
    due_date: typeof source.due_date === 'string' ? source.due_date : null,
    state: typeof source.state === 'string' ? source.state : undefined,
  };
}

function normalizeAllocation(raw: unknown): FinanceReceiptAllocation | null {
  if (!raw || typeof raw !== 'object') return null;
  const source = raw as Record<string, unknown>;
  const amount = normalizeMoneyValue(source.amount) ?? undefined;
  const remainingAfter =
    normalizeMoneyValue(source.remaining_after_payment) ??
    normalizeMoneyValue(source.remaining_after) ??
    undefined;
  return {
    id: typeof source.id === 'number' ? source.id : undefined,
    installment_id: typeof source.installment_id === 'number' ? source.installment_id : undefined,
    student_fee_id: typeof source.student_fee_id === 'number' ? source.student_fee_id : undefined,
    student_id: typeof source.student_id === 'number' ? source.student_id : undefined,
    student_name: typeof source.student_name === 'string' ? source.student_name : undefined,
    description:
      typeof source.description === 'string'
        ? source.description
        : typeof source.label === 'string'
          ? source.label
          : typeof source.name === 'string'
            ? source.name
            : undefined,
    due_date: typeof source.due_date === 'string' ? source.due_date : null,
    amount,
    label: typeof source.label === 'string' ? source.label : undefined,
    is_partial: source.is_partial === true || (amount != null && remainingAfter != null && remainingAfter > 0),
    remaining_after_payment: remainingAfter,
  };
}

function normalizeReceiptChild(raw: unknown): FinanceReceiptChildBreakdown | null {
  if (!raw || typeof raw !== 'object') return null;
  const source = raw as Record<string, unknown>;
  const allocations = Array.isArray(source.allocations)
    ? source.allocations
        .map(normalizeAllocation)
        .filter((row): row is FinanceReceiptAllocation => row != null)
    : undefined;
  const studentId =
    typeof source.student_id === 'number'
      ? source.student_id
      : typeof source.id === 'number'
        ? source.id
        : undefined;
  const studentName =
    typeof source.student_name === 'string'
      ? source.student_name
      : typeof source.name === 'string'
        ? source.name
        : undefined;
  if (studentId == null && !studentName && !allocations?.length) return null;
  return {
    student_id: studentId,
    student_name: studentName,
    allocated_amount: normalizeMoneyValue(source.allocated_amount) ?? undefined,
    unallocated_amount: normalizeMoneyValue(source.unallocated_amount) ?? undefined,
    allocations,
  };
}

function normalizeReceiptChildren(raw: unknown): FinanceReceiptChildBreakdown[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const children = raw
    .map(normalizeReceiptChild)
    .filter((row): row is FinanceReceiptChildBreakdown => row != null);
  return children.length ? children : undefined;
}

function normalizeTotals(raw: unknown): FinanceReceiptTotals | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const source = raw as Record<string, unknown>;
  return {
    collection_amount: normalizeMoneyValue(source.collection_amount) ?? undefined,
    allocated_amount: normalizeMoneyValue(source.allocated_amount) ?? undefined,
    unallocated_amount: normalizeMoneyValue(source.unallocated_amount) ?? undefined,
    allocation_status:
      typeof source.allocation_status === 'string' ? source.allocation_status : undefined,
  };
}

function normalizeSnapshot(raw: unknown): FinanceReceiptSnapshot | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const source = raw as Record<string, unknown>;
  const auditRaw = readRecord(source.audit);
  const payerRaw = source.payer;
  const studentRaw = source.student;
  const schoolRaw = source.school;
  const collectionRaw = readRecord(source.collection);
  const settlementRaw = readRecord(source.settlement);

  return {
    audit: Object.keys(auditRaw).length
      ? {
          source: typeof auditRaw.source === 'string' ? auditRaw.source : undefined,
          issued_at: typeof auditRaw.issued_at === 'string' ? auditRaw.issued_at : undefined,
          created_by: typeof auditRaw.created_by === 'string' ? auditRaw.created_by : undefined,
          confirmed_at: typeof auditRaw.confirmed_at === 'string' ? auditRaw.confirmed_at : undefined,
          confirmed_by: typeof auditRaw.confirmed_by === 'string' ? auditRaw.confirmed_by : undefined,
          receipt_number:
            typeof auditRaw.receipt_number === 'string' ? auditRaw.receipt_number : undefined,
        }
      : undefined,
    payer: payerRaw && typeof payerRaw === 'object' ? (payerRaw as FinanceReceiptSnapshot['payer']) : undefined,
    student:
      studentRaw && typeof studentRaw === 'object'
        ? (studentRaw as FinanceReceiptSnapshot['student'])
        : undefined,
    school:
      schoolRaw && typeof schoolRaw === 'object'
        ? (schoolRaw as FinanceReceiptSnapshot['school'])
        : undefined,
    collection: Object.keys(collectionRaw).length
      ? {
          id: typeof collectionRaw.id === 'number' ? collectionRaw.id : undefined,
          amount: normalizeMoneyValue(collectionRaw.amount) ?? undefined,
          journal: typeof collectionRaw.journal === 'string' ? collectionRaw.journal : undefined,
          currency: typeof collectionRaw.currency === 'string' ? collectionRaw.currency : undefined,
          reference: typeof collectionRaw.reference === 'string' ? collectionRaw.reference : undefined,
          payment_date:
            typeof collectionRaw.payment_date === 'string' ? collectionRaw.payment_date : undefined,
          payment_method:
            typeof collectionRaw.payment_method === 'string'
              ? collectionRaw.payment_method
              : undefined,
          currency_symbol:
            typeof collectionRaw.currency_symbol === 'string'
              ? collectionRaw.currency_symbol
              : undefined,
        }
      : undefined,
    cheque: normalizeCheque(source.cheque),
    totals: normalizeTotals(source.totals),
    settlement:
      Object.keys(settlementRaw).length > 0
        ? {
            status: typeof settlementRaw.status === 'string' ? settlementRaw.status : undefined,
            is_final: settlementRaw.is_final === true,
            label_ar: typeof settlementRaw.label_ar === 'string' ? settlementRaw.label_ar : undefined,
            label_fr: typeof settlementRaw.label_fr === 'string' ? settlementRaw.label_fr : undefined,
          }
        : undefined,
    allocations: Array.isArray(source.allocations)
      ? source.allocations
          .map(normalizeAllocation)
          .filter((row): row is FinanceReceiptAllocation => row != null)
      : undefined,
    children: normalizeReceiptChildren(source.children),
    is_multi_student: resolveIsMultiStudent({
      flag: source.is_multi_student,
      childrenLength: Array.isArray(source.children) ? source.children.length : undefined,
    }),
  };
}

export function normalizeFinanceReceipt(raw: unknown): FinanceReceipt | null {
  if (!raw || typeof raw !== 'object') return null;
  const source = raw as Record<string, unknown>;
  if (typeof source.id !== 'number') return null;

  const totals = normalizeTotals(source.totals);
  const snapshot = normalizeSnapshot(source.snapshot);
  const settlementRaw = readRecord(source.settlement);
  const children =
    normalizeReceiptChildren(source.children) ?? snapshot?.children;
  const childrenCount = resolveChildrenCount(source.children_count, children);

  return {
    id: source.id,
    number: typeof source.number === 'string' ? source.number : undefined,
    receipt_number:
      typeof source.receipt_number === 'string'
        ? source.receipt_number
        : typeof source.number === 'string'
          ? source.number
          : undefined,
    state: typeof source.state === 'string' ? source.state : undefined,
    settlement_status:
      typeof source.settlement_status === 'string' ? source.settlement_status : undefined,
    settlement:
      Object.keys(settlementRaw).length > 0
        ? {
            status: typeof settlementRaw.status === 'string' ? settlementRaw.status : undefined,
            is_final: settlementRaw.is_final === true,
            label_ar: typeof settlementRaw.label_ar === 'string' ? settlementRaw.label_ar : undefined,
            label_fr: typeof settlementRaw.label_fr === 'string' ? settlementRaw.label_fr : undefined,
          }
        : undefined,
    collection_id: typeof source.collection_id === 'number' ? source.collection_id : undefined,
    school_id: typeof source.school_id === 'number' ? source.school_id : undefined,
    student_id: typeof source.student_id === 'number' ? source.student_id : undefined,
    student_name: typeof source.student_name === 'string' ? source.student_name : undefined,
    payer_name: typeof source.payer_name === 'string' ? source.payer_name : undefined,
    actual_payer_name:
      typeof source.actual_payer_name === 'string' ? source.actual_payer_name : undefined,
    billing_partner_id: normalizeNumberId(source.billing_partner_id),
    billing_partner_name:
      typeof source.billing_partner_name === 'string' ? source.billing_partner_name : undefined,
    issued_at: typeof source.issued_at === 'string' ? source.issued_at : null,
    issued_by:
      typeof source.issued_by === 'string'
        ? source.issued_by
        : source.issued_by && typeof source.issued_by === 'object'
          ? (source.issued_by as FinanceReceipt['issued_by'])
          : snapshot?.audit?.created_by ?? null,
    print_count: typeof source.print_count === 'number' ? source.print_count : undefined,
    generated_from_legacy: source.generated_from_legacy === true,
    collection_amount:
      normalizeMoneyValue(source.collection_amount) ?? totals?.collection_amount ?? undefined,
    allocated_amount:
      normalizeMoneyValue(source.allocated_amount) ?? totals?.allocated_amount ?? undefined,
    unallocated_amount:
      normalizeMoneyValue(source.unallocated_amount) ?? totals?.unallocated_amount ?? undefined,
    allocation_status:
      typeof source.allocation_status === 'string'
        ? source.allocation_status
        : totals?.allocation_status,
    payment_method:
      typeof source.payment_method === 'string'
        ? source.payment_method
        : snapshot?.collection?.payment_method,
    allowed_actions: normalizeStringArray(source.allowed_actions),
    print_url: typeof source.print_url === 'string' ? source.print_url : undefined,
    snapshot,
    totals,
    allocations: Array.isArray(source.allocations)
      ? source.allocations
          .map(normalizeAllocation)
          .filter((row): row is FinanceReceiptAllocation => row != null)
      : snapshot?.allocations,
    children,
    children_count: childrenCount,
    collection_scope:
      typeof source.collection_scope === 'string' ? source.collection_scope : undefined,
    involved_student_ids: normalizeInvolvedStudentIds(source.involved_student_ids),
    is_multi_student: resolveIsMultiStudent({
      flag: source.is_multi_student,
      snapshotFlag: snapshot?.is_multi_student,
      childrenCount,
      childrenLength: children?.length,
    }),
    cheque: normalizeCheque(source.cheque) ?? snapshot?.cheque,
    currency:
      typeof source.currency === 'string'
        ? source.currency
        : snapshot?.collection?.currency,
  };
}

export function parseFinanceReceiptList(data: unknown): FinanceReceipt[] {
  return parseFinanceList<unknown>(data)
    .map(normalizeFinanceReceipt)
    .filter((row): row is FinanceReceipt => row != null);
}

export function receiptAllowsAction(receipt: FinanceReceipt | null | undefined, action: string): boolean {
  if (!receipt?.allowed_actions?.length) return false;
  return receipt.allowed_actions.includes(action);
}

export type ReceiptPrintLayout = 'a4' | 'a5' | 'thermal_80mm';

export function buildReceiptPdfFilename(
  receipt: FinanceReceipt,
  lang: 'ar' | 'fr',
  layout: ReceiptPrintLayout = 'a4',
): string {
  const number = (receipt.number ?? receipt.receipt_number ?? `receipt-${receipt.id}`)
    .replace(/[^\w\-./]+/g, '-')
    .replace(/\//g, '-');
  return `receipt-${number}-${lang}-${layout}.pdf`;
}
