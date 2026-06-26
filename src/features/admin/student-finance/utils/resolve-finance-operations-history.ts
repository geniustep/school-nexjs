import type { FinanceCurrency, StudentFinanceWorkspace } from '../types';
import type { FinanceOperationHistoryEntry, FinanceOperationKind } from '../types/agreement-context';
import {
  classifyActorDisplayName,
  FINANCE_PERFORMED_BY_MANAGER_KEY,
  FINANCE_PERFORMED_BY_SYSTEM_KEY,
  FINANCE_PERFORMED_BY_UNAVAILABLE_KEY,
  FINANCE_PERFORMED_BY_USER_KEY,
} from '@/lib/utils/actor-display-name';

const I18N_PREFIX = 'admin.student360.financeWorkspace.agreementContext.operations.types';
const UNKNOWN_LABEL_KEY = `${I18N_PREFIX}.unknown`;

const OPERATION_ALIASES: Record<string, FinanceOperationKind> = {
  agreement_created: 'agreement_created',
  create_agreement: 'agreement_created',
  agreement_create: 'agreement_created',
  agreement_submitted: 'agreement_submitted',
  submit_agreement: 'agreement_submitted',
  agreement_approved: 'agreement_approved',
  approve_agreement: 'agreement_approved',
  agreement_activated: 'agreement_activated',
  activate_agreement: 'agreement_activated',
  agreement_activate: 'agreement_activated',
  agreement_cancelled: 'agreement_cancelled',
  cancel_agreement: 'agreement_cancelled',
  agreement_cancel: 'agreement_cancelled',
  agreement_reset: 'agreement_reset',
  reset_financial_agreement: 'agreement_reset',
  financial_agreement_reset: 'agreement_reset',
  fees_generated: 'fees_generated',
  generate_fees: 'fees_generated',
  installments_generated: 'installments_generated',
  generate_installments: 'installments_generated',
  schedule_generate: 'installments_generated',
  payment_collected: 'payment_collected',
  record_collection: 'payment_collected',
  payment_collection: 'payment_collected',
  receipt_issued: 'receipt_issued',
  issue_receipt: 'receipt_issued',
  receipt_issue: 'receipt_issued',
  collection_reversed: 'collection_reversed',
  reverse_operation: 'collection_reversed',
  collection_cancel: 'collection_reversed',
};

function normalizeSlug(value: string): string {
  return value.trim().toLowerCase().replace(/[\s-]+/g, '_');
}

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function readOperationKind(raw: Record<string, unknown>): FinanceOperationKind {
  const candidates = [
    raw.operation_type,
    raw.operation_kind,
    raw.action,
    raw.type,
    raw.event_type,
    raw.label,
  ];
  for (const candidate of candidates) {
    if (typeof candidate !== 'string') continue;
    const slug = normalizeSlug(candidate);
    if (OPERATION_ALIASES[slug]) return OPERATION_ALIASES[slug];
  }
  return 'unknown';
}

function operationLabelKey(kind: FinanceOperationKind): string {
  return kind === 'unknown' ? UNKNOWN_LABEL_KEY : `${I18N_PREFIX}.${kind}`;
}

function readAmount(raw: Record<string, unknown>): number | null {
  const candidates = [raw.amount, raw.value, raw.total];
  for (const candidate of candidates) {
    if (typeof candidate === 'number' && Number.isFinite(candidate)) return candidate;
    if (typeof candidate === 'string' && candidate.trim()) {
      const parsed = Number(candidate);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
}

function readCurrency(raw: Record<string, unknown>): FinanceCurrency | null {
  const candidate = raw.currency;
  if (!candidate) return null;
  if (typeof candidate === 'string' && candidate.trim()) {
    return { id: 0, name: candidate.trim() };
  }
  if (typeof candidate !== 'object') return null;
  const obj = candidate as Record<string, unknown>;
  const name = readString(obj.name) ?? readString(obj.code);
  if (!name) return null;
  return {
    id: typeof obj.id === 'number' ? obj.id : 0,
    name,
    symbol: readString(obj.symbol) ?? undefined,
  };
}

export function resolvePerformedByLabel(raw: Record<string, unknown>): {
  performedByLabel: string;
  performedByKey: string;
} {
  const userCandidates = [
    readString(raw.performed_by),
    readString(raw.user_name),
    readString(raw.audit_user),
    readString(readRecord(raw.performed_by).name),
    readString(readRecord(raw.create_uid).name),
    readString(readRecord(raw.write_uid).name),
    readString(raw.create_uid),
    readString(raw.write_uid),
  ].filter(Boolean) as string[];

  for (const candidate of userCandidates) {
    const actor = classifyActorDisplayName(candidate);
    if (actor.kind === 'manager') {
      return {
        performedByLabel: '',
        performedByKey: FINANCE_PERFORMED_BY_MANAGER_KEY,
      };
    }
    if (actor.kind === 'system') {
      return {
        performedByLabel: '',
        performedByKey: FINANCE_PERFORMED_BY_SYSTEM_KEY,
      };
    }
    if (actor.displayName) {
      return {
        performedByLabel: actor.displayName,
        performedByKey: FINANCE_PERFORMED_BY_USER_KEY,
      };
    }
  }

  return {
    performedByLabel: '',
    performedByKey: FINANCE_PERFORMED_BY_UNAVAILABLE_KEY,
  };
}

function readReference(raw: Record<string, unknown>): string | null {
  return (
    readString(raw.reference) ??
    readString(raw.receipt_number) ??
    readString(raw.agreement_number) ??
    readString(raw.number) ??
    readString(raw.name) ??
    (typeof raw.agreement_id === 'number' ? `#${raw.agreement_id}` : null) ??
    (typeof raw.receipt_id === 'number' ? `#${raw.receipt_id}` : null) ??
    (typeof raw.id === 'number' ? `#${raw.id}` : null)
  );
}

function normalizeOperationEntry(raw: unknown, index: number): FinanceOperationHistoryEntry | null {
  const obj = readRecord(raw);
  const date =
    readString(obj.date) ??
    readString(obj.performed_at) ??
    readString(obj.created_at) ??
    readString(obj.timestamp);
  const kind = readOperationKind(obj);
  const performedBy = resolvePerformedByLabel(obj);
  const id =
    readString(obj.id) ??
    readString(obj.uuid) ??
    `${kind}-${date ?? 'undated'}-${index}`;

  return {
    id,
    date,
    operationKind: kind,
    operationLabelKey: operationLabelKey(kind),
    description: readString(obj.description) ?? readString(obj.note) ?? readString(obj.summary),
    performedByLabel: performedBy.performedByLabel,
    performedByKey: performedBy.performedByKey,
    state: readString(obj.state) ?? readString(obj.status),
    reference: readReference(obj),
    amount: readAmount(obj),
    currency: readCurrency(obj),
  };
}

function readOperationsArray(workspace?: StudentFinanceWorkspace | null): unknown[] | null {
  if (!workspace) return null;
  if (Array.isArray(workspace.finance_operations_history)) {
    return workspace.finance_operations_history;
  }
  const raw = workspace as StudentFinanceWorkspace & Record<string, unknown>;
  const legacyCandidates = [
    raw.operations_history,
    raw.financial_operations_history,
    raw.audit_trail,
    raw.recent_operations,
  ];
  for (const candidate of legacyCandidates) {
    if (Array.isArray(candidate)) return candidate;
  }
  return null;
}

export function resolveFinanceOperationsHistory(
  workspace?: StudentFinanceWorkspace | null,
): FinanceOperationHistoryEntry[] {
  const rawEntries = readOperationsArray(workspace);
  if (!rawEntries) return [];
  return rawEntries
    .map(normalizeOperationEntry)
    .filter((entry): entry is FinanceOperationHistoryEntry => entry != null);
}

export function hasFinanceOperationsHistoryApi(workspace?: StudentFinanceWorkspace | null): boolean {
  return readOperationsArray(workspace) != null;
}
