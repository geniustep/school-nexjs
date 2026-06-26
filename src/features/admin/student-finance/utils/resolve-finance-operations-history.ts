import type { StudentFinanceWorkspace } from '../types';
import type { FinanceOperationHistoryEntry, FinanceOperationKind } from '../types/agreement-context';

const I18N_PREFIX = 'admin.student360.financeWorkspace.agreementContext.operations.types';

const OPERATION_ALIASES: Record<string, FinanceOperationKind> = {
  create_agreement: 'create_agreement',
  agreement_create: 'create_agreement',
  update_agreement: 'update_agreement',
  agreement_update: 'update_agreement',
  cancel_agreement: 'cancel_agreement',
  agreement_cancel: 'cancel_agreement',
  activate_agreement: 'activate_agreement',
  agreement_activate: 'activate_agreement',
  generate_installments: 'generate_installments',
  schedule_generate: 'generate_installments',
  record_collection: 'record_collection',
  payment_collection: 'record_collection',
  issue_receipt: 'issue_receipt',
  receipt_issue: 'issue_receipt',
  reverse_operation: 'reverse_operation',
  collection_cancel: 'reverse_operation',
  reset_financial_agreement: 'reset_financial_agreement',
  financial_agreement_reset: 'reset_financial_agreement',
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
  ];
  for (const candidate of candidates) {
    if (typeof candidate !== 'string') continue;
    const slug = normalizeSlug(candidate);
    if (OPERATION_ALIASES[slug]) return OPERATION_ALIASES[slug];
  }
  return 'unknown';
}

function operationLabelKey(kind: FinanceOperationKind): string {
  return `${I18N_PREFIX}.${kind}`;
}

export function resolvePerformedByLabel(raw: Record<string, unknown>): {
  performedByLabel: string;
  performedByKey: string;
} {
  const systemKeys = ['system', 'odoo', 'auto', 'automation'];
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
    if (systemKeys.includes(normalizeSlug(candidate))) {
      return {
        performedByLabel: '',
        performedByKey: 'admin.student360.financeWorkspace.agreementContext.performedBySystem',
      };
    }
    return {
      performedByLabel: candidate,
      performedByKey: 'admin.student360.financeWorkspace.agreementContext.performedByUser',
    };
  }

  return {
    performedByLabel: '',
    performedByKey: 'admin.student360.financeWorkspace.agreementContext.performedByUnavailable',
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
  };
}

function readOperationsArray(workspace?: StudentFinanceWorkspace | null): unknown[] | null {
  if (!workspace) return null;
  const raw = workspace as StudentFinanceWorkspace & Record<string, unknown>;
  const candidates = [
    raw.finance_operations_history,
    raw.operations_history,
    raw.financial_operations_history,
    raw.audit_trail,
    raw.recent_operations,
  ];
  for (const candidate of candidates) {
    if (Array.isArray(candidate) && candidate.length > 0) return candidate;
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
