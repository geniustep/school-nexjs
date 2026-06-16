import type {
  FeeType,
  FeeTypeAction,
  FeeTypeCurrency,
  FeeTypeDetail,
  FeeTypeUsage,
  FeeTypeUsageSummary,
  UpdateFeeTypePayload,
} from '@/types/finance';

export type FeeTypeActiveFilter = 'active' | 'archived' | 'all';

export type FeeTypeErrorCode =
  | 'fee_type_not_found'
  | 'forbidden'
  | 'fee_type_in_use'
  | 'fee_type_delete_forbidden'
  | 'fee_type_code_exists'
  | 'fee_type_restore_conflict'
  | 'invalid_amount'
  | 'invalid_fee_type_category'
  | 'invalid_fee_type_frequency'
  | 'fee_type_code_locked'
  | 'invalid_field';

const FEE_TYPE_ACTIONS: FeeTypeAction[] = ['view', 'edit', 'archive', 'restore', 'delete'];

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function asBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  if (value === 1 || value === '1' || value === 'true') return true;
  if (value === 0 || value === '0' || value === 'false') return false;
  return undefined;
}

export function normalizeFeeTypeCurrency(raw: unknown): FeeTypeCurrency | undefined {
  if (typeof raw === 'string' && raw.trim()) {
    return { id: 0, name: raw.trim() };
  }
  const record = asRecord(raw);
  if (!record) return undefined;
  const id = asNumber(record.id);
  const name = typeof record.name === 'string' ? record.name : undefined;
  if (id == null && !name) return undefined;
  return {
    id: id ?? 0,
    name: name ?? '',
    symbol: typeof record.symbol === 'string' ? record.symbol : undefined,
    decimal_places: asNumber(record.decimal_places),
  };
}

export function normalizeFeeTypeUsageSummary(raw: unknown): FeeTypeUsageSummary | undefined {
  const record = asRecord(raw);
  if (!record) return undefined;
  return {
    is_used: asBoolean(record.is_used),
    historical_usage: asBoolean(record.historical_usage),
    can_delete: asBoolean(record.can_delete),
  };
}

export function normalizeFeeTypeUsage(raw: unknown): FeeTypeUsage | undefined {
  const record = asRecord(raw);
  if (!record) return undefined;
  return {
    fee_plan_count: asNumber(record.fee_plan_count) ?? 0,
    confirmed_fee_plan_count: asNumber(record.confirmed_fee_plan_count) ?? 0,
    agreement_count: asNumber(record.agreement_count) ?? 0,
    student_fee_count: asNumber(record.student_fee_count) ?? 0,
    installment_count: asNumber(record.installment_count) ?? 0,
    collection_count: asNumber(record.collection_count) ?? 0,
    receipt_count: asNumber(record.receipt_count) ?? 0,
    historical_usage: asBoolean(record.historical_usage) ?? false,
    can_delete: asBoolean(record.can_delete) ?? false,
  };
}

export function normalizeAllowedActions(raw: unknown): FeeTypeAction[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((item): item is FeeTypeAction =>
    typeof item === 'string' && FEE_TYPE_ACTIONS.includes(item as FeeTypeAction),
  );
}

export function normalizeFeeTypeListItem(raw: unknown): FeeType | null {
  const record = asRecord(raw);
  if (!record) return null;
  const id = asNumber(record.id);
  const code = typeof record.code === 'string' ? record.code : '';
  const name = typeof record.name === 'string' ? record.name : '';
  const schoolId = asNumber(record.school_id);
  if (id == null || !code || !name || schoolId == null) return null;

  const schoolRecord = asRecord(record.school);
  return {
    id,
    code,
    name,
    school_id: schoolId,
    school: schoolRecord
      ? { id: asNumber(schoolRecord.id) ?? schoolId, name: String(schoolRecord.name ?? '') }
      : undefined,
    category: typeof record.category === 'string' ? record.category : undefined,
    frequency: typeof record.frequency === 'string' ? record.frequency : undefined,
    default_amount: asNumber(record.default_amount),
    currency: normalizeFeeTypeCurrency(record.currency),
    is_mandatory: asBoolean(record.is_mandatory),
    requires_subscription: asBoolean(record.requires_subscription),
    requires_usage_tracking: asBoolean(record.requires_usage_tracking),
    active: asBoolean(record.active) ?? true,
    sequence: asNumber(record.sequence),
    description:
      record.description === null || typeof record.description === 'string'
        ? record.description
        : undefined,
    usage_summary: normalizeFeeTypeUsageSummary(record.usage_summary),
    allowed_actions: normalizeAllowedActions(record.allowed_actions),
  };
}

export function normalizeFeeTypeDetail(raw: unknown): FeeTypeDetail | null {
  const base = normalizeFeeTypeListItem(raw);
  if (!base) return null;
  const record = asRecord(raw);
  return {
    ...base,
    usage: normalizeFeeTypeUsage(record?.usage),
    create_date: typeof record?.create_date === 'string' ? record.create_date : undefined,
    write_date: typeof record?.write_date === 'string' ? record.write_date : undefined,
  };
}

export function normalizeFeeTypeList(raw: unknown): FeeType[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(normalizeFeeTypeListItem).filter((item): item is FeeType => item != null);
}

export function feeTypeAllowsAction(
  feeType: Pick<FeeType, 'allowed_actions'> | null | undefined,
  action: FeeTypeAction,
): boolean {
  return normalizeAllowedActions(feeType?.allowed_actions).includes(action);
}

export function feeTypeActiveQueryParam(filter: FeeTypeActiveFilter): string | undefined {
  if (filter === 'archived') return '0';
  if (filter === 'all') return 'all';
  return undefined;
}

export function parseFeeTypeActiveFilter(raw: string | null | undefined): FeeTypeActiveFilter {
  if (raw === 'archived' || raw === '0' || raw === 'false') return 'archived';
  if (raw === 'all') return 'all';
  return 'active';
}

export function feeTypeCurrencyId(currency: FeeType['currency']): number | undefined {
  const normalized = normalizeFeeTypeCurrency(currency);
  return normalized?.id && normalized.id > 0 ? normalized.id : undefined;
}

export function feeTypeUsageIsEmpty(usage: FeeTypeUsage | undefined): boolean {
  if (!usage) return true;
  return (
    (usage.fee_plan_count ?? 0) === 0 &&
    (usage.confirmed_fee_plan_count ?? 0) === 0 &&
    (usage.agreement_count ?? 0) === 0 &&
    (usage.student_fee_count ?? 0) === 0 &&
    (usage.installment_count ?? 0) === 0 &&
    (usage.collection_count ?? 0) === 0 &&
    (usage.receipt_count ?? 0) === 0
  );
}

export function resolveFeeTypeErrorCode(code: string | undefined): FeeTypeErrorCode | null {
  if (!code) return null;
  const known: FeeTypeErrorCode[] = [
    'fee_type_not_found',
    'forbidden',
    'fee_type_in_use',
    'fee_type_delete_forbidden',
    'fee_type_code_exists',
    'fee_type_restore_conflict',
    'invalid_amount',
    'invalid_fee_type_category',
    'invalid_fee_type_frequency',
    'fee_type_code_locked',
    'invalid_field',
  ];
  return known.includes(code as FeeTypeErrorCode) ? (code as FeeTypeErrorCode) : null;
}

export function feeTypeErrorMessageKey(code: FeeTypeErrorCode): string {
  return `admin.finance.feeTypesWorkspace.errors.${code}`;
}

export interface FeeTypeFormValues {
  name: string;
  code: string;
  category: string;
  requiresSubscription: boolean;
  requiresUsageTracking: boolean;
  sequence: string;
  description: string;
}

export function feeTypeFormValuesFromDetail(detail: FeeTypeDetail): FeeTypeFormValues {
  return {
    name: detail.name,
    code: detail.code,
    category: detail.category ?? 'tuition',
    requiresSubscription: detail.requires_subscription ?? false,
    requiresUsageTracking: detail.requires_usage_tracking ?? false,
    sequence: detail.sequence != null ? String(detail.sequence) : '',
    description: detail.description ?? '',
  };
}

export function buildFeeTypeUpdatePayload(
  original: FeeTypeDetail,
  values: FeeTypeFormValues,
): UpdateFeeTypePayload {
  const payload: UpdateFeeTypePayload = {};
  const trimmedName = values.name.trim();
  const trimmedCode = values.code.trim();
  const trimmedDescription = values.description.trim();
  const sequenceRaw = values.sequence.trim();
  const sequence = sequenceRaw ? Number(sequenceRaw) : undefined;

  if (trimmedName && trimmedName !== original.name) payload.name = trimmedName;
  if (trimmedCode && trimmedCode !== original.code) payload.code = trimmedCode;
  if (values.category && values.category !== (original.category ?? '')) payload.category = values.category;
  if (values.requiresSubscription !== (original.requires_subscription ?? false)) {
    payload.requires_subscription = values.requiresSubscription;
  }
  if (values.requiresUsageTracking !== (original.requires_usage_tracking ?? false)) {
    payload.requires_usage_tracking = values.requiresUsageTracking;
  }
  if (sequence !== undefined && sequence !== original.sequence) payload.sequence = sequence;
  const originalDescription = original.description ?? '';
  if (trimmedDescription !== originalDescription) {
    payload.description = trimmedDescription || null;
  }
  return payload;
}

export function buildFeeTypeListPath(filters: {
  search?: string;
  active?: FeeTypeActiveFilter;
  page?: number;
  page_size?: number;
}): string {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.active && filters.active !== 'active') params.set('active', filters.active);
  if (filters.page && filters.page > 1) params.set('page', String(filters.page));
  if (filters.page_size && filters.page_size !== 20) params.set('page_size', String(filters.page_size));
  const qs = params.toString();
  return qs ? `/admin/finance/fee-types?${qs}` : '/admin/finance/fee-types';
}
