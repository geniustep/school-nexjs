import { endpoints } from '@/lib/api/endpoints';
import type { ListParams } from '@/types/api';

export type CollectionLedgerRecordType = 'operational' | 'historical';
export type CollectionLedgerRecordTypeFilter = 'all' | CollectionLedgerRecordType;

export type CollectionLedgerNamedRef = {
  id: number | string | null;
  name: string | null;
  code?: string | null;
};

export type CollectionLedgerService = {
  fee_type_id: number | null;
  name: string | null;
  amount: number;
  settlement_ids: number[];
};

export type CollectionLedgerRecord = {
  uid: string;
  record_type: CollectionLedgerRecordType;
  reference: string | null;
  amount: number;
  status: string | null;
  student: CollectionLedgerNamedRef | null;
  school: CollectionLedgerNamedRef | null;
  academic_year: CollectionLedgerNamedRef | null;
  services: CollectionLedgerService[];
  sort_date: string | null;
  sort_date_kind: string | null;
  payment_date: string | null;
  payment_method: string | null;
  original_payment_date: string | null;
  original_payment_date_state: string | null;
  original_payment_method: string | null;
  original_payment_method_state: string | null;
  migration_cutoff_date: string | null;
  recognized_in_raqeem_at: string | null;
  receipt_ref: string | null;
  receipt_id: number | null;
  collection_id: number | null;
  printable_document_available: boolean;
  source_type: string | null;
  source_name: string | null;
  source_print_date: string | null;
  batch_id: number | null;
  settlement_ids: number[];
};

export type CollectionLedgerSummary = {
  operational_collected: number;
  historical_paid: number;
  recognized_paid: number;
  operational_count: number;
  historical_count: number;
  records_count: number;
  currency_id: number | null;
  currency_name: string | null;
};

export type CollectionLedgerListPayload = {
  items: CollectionLedgerRecord[];
  summary: CollectionLedgerSummary | null;
};

export type CollectionLedgerFilters = {
  recordType: CollectionLedgerRecordTypeFilter;
  search: string;
  academicYearId: string;
  serviceId: string;
  recognizedDateFrom: string;
  recognizedDateTo: string;
  page: number;
};

export const COLLECTION_LEDGER_PAGE_SIZE = 50;

const COLLECTION_LEDGER_BASE = endpoints.admin.financeCollectionReports.replace(
  '/reports/collections',
  '/collection-ledger',
);

export const collectionLedgerEndpoints = {
  list: COLLECTION_LEDGER_BASE,
  aggregations: `${COLLECTION_LEDGER_BASE}/aggregations`,
  detail: (uid: string) => `${COLLECTION_LEDGER_BASE}/${encodeURIComponent(uid)}`,
  receipt: (uid: string) => `${COLLECTION_LEDGER_BASE}/${encodeURIComponent(uid)}/receipt`,
};

export function collectionLedgerReceiptProxyUrl(uid: string): string {
  return `/api/odoo${collectionLedgerEndpoints.receipt(uid)}`;
}

export function defaultCollectionLedgerFilters(): CollectionLedgerFilters {
  return {
    recordType: 'all',
    search: '',
    academicYearId: '',
    serviceId: '',
    recognizedDateFrom: '',
    recognizedDateTo: '',
    page: 1,
  };
}

export function buildCollectionLedgerQuery(filters: CollectionLedgerFilters): ListParams {
  const query: ListParams = {
    page: filters.page,
    page_size: COLLECTION_LEDGER_PAGE_SIZE,
  };
  if (filters.recordType !== 'all') query.record_type = filters.recordType;
  if (filters.search.trim()) query.search = filters.search.trim();
  if (filters.academicYearId.trim()) query.academic_year_id = Number(filters.academicYearId);
  if (filters.serviceId.trim()) query.service_id = Number(filters.serviceId);
  if (filters.recognizedDateFrom.trim()) query.recognized_date_from = filters.recognizedDateFrom.trim();
  if (filters.recognizedDateTo.trim()) query.recognized_date_to = filters.recognizedDateTo.trim();
  return query;
}

export function buildCollectionLedgerAggregationsQuery(filters: CollectionLedgerFilters): ListParams {
  const { page: _page, page_size: _pageSize, ...query } = buildCollectionLedgerQuery(filters);
  return query;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function numberOrZero(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function numberOrNull(value: unknown): number | null {
  const parsed = numberOrZero(value);
  return parsed === 0 && value !== 0 && value !== '0' ? null : parsed;
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function asNamedRef(value: unknown): CollectionLedgerNamedRef | null {
  const row = asRecord(value);
  if (!row) return null;
  const id = row.id;
  return {
    id: typeof id === 'number' || typeof id === 'string' ? id : null,
    name:
      stringOrNull(row.name) ??
      stringOrNull(row.display_name) ??
      stringOrNull(row.student_name) ??
      null,
    code: stringOrNull(row.code) ?? stringOrNull(row.matricule),
  };
}

function asNumberArray(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item) && item > 0);
}

function normalizeService(value: unknown): CollectionLedgerService | null {
  const row = asRecord(value);
  if (!row) return null;
  const feeType = asRecord(row.fee_type);
  const id =
    numberOrNull(row.fee_type_id) ??
    numberOrNull(feeType?.id) ??
    numberOrNull(row.service_id);
  const name =
    stringOrNull(row.fee_type_name) ??
    stringOrNull(row.service_name) ??
    stringOrNull(row.name) ??
    stringOrNull(row.display_name) ??
    stringOrNull(feeType?.name) ??
    stringOrNull(feeType?.display_name);
  return {
    fee_type_id: id,
    name,
    amount: numberOrZero(row.historical_amount ?? row.amount ?? row.allocated_amount),
    settlement_ids: asNumberArray(row.settlement_ids),
  };
}

export function normalizeCollectionLedgerRecord(value: unknown): CollectionLedgerRecord | null {
  const row = asRecord(value);
  if (!row) return null;
  const uid = stringOrNull(row.uid);
  const inferredType = uid?.startsWith('historical:') ? 'historical' : 'operational';
  const recordTypeRaw = stringOrNull(row.record_type);
  const recordType: CollectionLedgerRecordType =
    recordTypeRaw === 'historical' || recordTypeRaw === 'operational'
      ? recordTypeRaw
      : inferredType;
  if (!uid) return null;

  const services = (Array.isArray(row.services) ? row.services : [])
    .map(normalizeService)
    .filter((item): item is CollectionLedgerService => item != null);

  return {
    uid,
    record_type: recordType,
    reference:
      stringOrNull(row.reference) ??
      stringOrNull(row.receipt_ref) ??
      stringOrNull(row.collection_reference),
    amount: numberOrZero(row.amount ?? row.total_amount ?? row.collection_amount),
    status: stringOrNull(row.status) ?? stringOrNull(row.state),
    student: asNamedRef(row.student),
    school: asNamedRef(row.school),
    academic_year: asNamedRef(row.academic_year),
    services,
    sort_date: stringOrNull(row.sort_date),
    sort_date_kind: stringOrNull(row.sort_date_kind),
    payment_date: stringOrNull(row.payment_date),
    payment_method: stringOrNull(row.payment_method),
    original_payment_date: stringOrNull(row.original_payment_date),
    original_payment_date_state: stringOrNull(row.original_payment_date_state),
    original_payment_method: stringOrNull(row.original_payment_method),
    original_payment_method_state: stringOrNull(row.original_payment_method_state),
    migration_cutoff_date: stringOrNull(row.migration_cutoff_date),
    recognized_in_raqeem_at: stringOrNull(row.recognized_in_raqeem_at ?? row.applied_at),
    receipt_ref: stringOrNull(row.receipt_ref) ?? stringOrNull(row.receipt_number),
    receipt_id: numberOrNull(row.receipt_id),
    collection_id: numberOrNull(row.collection_id),
    printable_document_available: row.printable_document_available !== false,
    source_type: stringOrNull(row.source_type),
    source_name: stringOrNull(row.source_name),
    source_print_date: stringOrNull(row.source_print_date),
    batch_id: numberOrNull(row.batch_id),
    settlement_ids: asNumberArray(row.settlement_ids),
  };
}

export function normalizeCollectionLedgerSummary(value: unknown): CollectionLedgerSummary | null {
  const root = asRecord(value);
  if (!root) return null;
  const row = asRecord(root.summary) ?? root;
  const operational = numberOrZero(
    row.operational_collected ?? row.operational_paid ?? row.operational_total,
  );
  const historical = numberOrZero(row.historical_paid ?? row.historical_total);
  const recognizedRaw = row.recognized_paid ?? row.recognized_total;
  const recognized = recognizedRaw == null ? operational + historical : numberOrZero(recognizedRaw);
  return {
    operational_collected: operational,
    historical_paid: historical,
    recognized_paid: recognized,
    operational_count: numberOrZero(row.operational_count ?? row.operational_records_count),
    historical_count: numberOrZero(row.historical_count ?? row.historical_records_count),
    records_count: numberOrZero(
      row.records_count ?? row.total_count ??
        numberOrZero(row.operational_count ?? row.operational_records_count) +
          numberOrZero(row.historical_count ?? row.historical_records_count),
    ),
    currency_id: numberOrNull(row.currency_id),
    currency_name: stringOrNull(row.currency_name),
  };
}

export function normalizeCollectionLedgerListPayload(value: unknown): CollectionLedgerListPayload | null {
  const row = asRecord(value);
  if (!row) return null;
  const rawItems = Array.isArray(row.items)
    ? row.items
    : Array.isArray(row.records)
      ? row.records
      : [];
  return {
    items: rawItems
      .map(normalizeCollectionLedgerRecord)
      .filter((item): item is CollectionLedgerRecord => item != null),
    summary: normalizeCollectionLedgerSummary(row),
  };
}

export function normalizeCollectionLedgerDetailPayload(value: unknown): CollectionLedgerRecord | null {
  const row = asRecord(value);
  if (!row) return null;
  return normalizeCollectionLedgerRecord(row.item ?? row.record ?? row);
}

export function collectionLedgerDisplayDate(record: CollectionLedgerRecord): string | null {
  return record.record_type === 'historical'
    ? record.recognized_in_raqeem_at ?? record.sort_date
    : record.payment_date ?? record.sort_date;
}

export function collectionLedgerServiceSummary(record: CollectionLedgerRecord): string {
  return record.services
    .map((service) => service.name)
    .filter((name): name is string => Boolean(name))
    .join(' · ');
}
