import { normalizeMoneyValue } from '@/lib/utils/finance-normalize';
import type {
  FamilyCollectionAllocation,
  FamilyCollectionAllocationMode,
  FamilyCollectionContext,
  FamilyCollectionCreateResponse,
  FamilyCollectionPreviewResponse,
  FamilyCollectionRecord,
  FamilyCollectionReceiptRecord,
  FamilyFinanceChild,
  FamilyFinanceServiceSummary,
  FamilyFinanceServiceType,
  FamilyFinanceSummary,
  FamilyOpenInstallment,
  FamilyPlanContext,
  FamilyPlanSibling,
} from '@/types/family-finance';

const SERVICE_TYPES: FamilyFinanceServiceType[] = [
  'tuition',
  'registration',
  'transport',
  'canteen',
  'books',
  'activities',
  'other',
];

function readRecord(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== 'object') return null;
  return raw as Record<string, unknown>;
}

function readString(raw: unknown): string | null {
  return typeof raw === 'string' && raw.trim() ? raw.trim() : null;
}

function readNumber(raw: unknown): number | null {
  if (typeof raw === 'number' && !Number.isNaN(raw)) return raw;
  return null;
}

function readBoolean(raw: unknown): boolean | null {
  if (typeof raw === 'boolean') return raw;
  return null;
}

function readServiceType(raw: unknown): FamilyFinanceServiceType {
  const value = readString(raw);
  if (value && SERVICE_TYPES.includes(value as FamilyFinanceServiceType)) {
    return value as FamilyFinanceServiceType;
  }
  return 'other';
}

function normalizeServiceSummary(raw: unknown): FamilyFinanceServiceSummary | null {
  const row = readRecord(raw);
  if (!row) return null;
  return {
    service_type: readServiceType(row.service_type),
    label: readString(row.label),
    amount_due: normalizeMoneyValue(row.amount_due),
    amount_paid: normalizeMoneyValue(row.amount_paid),
    amount_remaining: normalizeMoneyValue(row.amount_remaining),
  };
}

function normalizeChild(raw: unknown): FamilyFinanceChild | null {
  const row = readRecord(raw);
  if (!row) return null;
  const studentId = readNumber(row.student_id);
  if (studentId == null) return null;
  const services = Array.isArray(row.services_summary)
    ? row.services_summary
        .map(normalizeServiceSummary)
        .filter((item): item is FamilyFinanceServiceSummary => item != null)
    : [];
  return {
    student_id: studentId,
    student_name: readString(row.student_name) ?? readString(row.name),
    class_name: readString(row.class_name) ?? readString(row.class),
    level_name: readString(row.level_name) ?? readString(row.level),
    section_name: readString(row.section_name) ?? readString(row.section),
    total_net_due: normalizeMoneyValue(row.total_net_due ?? row.net_due ?? row.total_due),
    total_paid: normalizeMoneyValue(row.total_paid ?? row.paid_amount ?? row.paid),
    total_remaining: normalizeMoneyValue(row.total_remaining ?? row.remaining_amount ?? row.remaining),
    total_overdue: normalizeMoneyValue(row.total_overdue ?? row.overdue_amount ?? row.overdue),
    services_summary: services,
  };
}

function readGuardian(row: Record<string, unknown>): Record<string, unknown> | null {
  return readRecord(row.guardian) ?? readRecord(readRecord(row.family_account)?.guardian);
}

function readFamilyId(row: Record<string, unknown>): number | null {
  const guardian = readGuardian(row);
  const familyAccount = readRecord(row.family_account);
  const familySummary = readRecord(row.family_summary);
  return (
    readNumber(row.family_id) ??
    readNumber(familyAccount?.family_id) ??
    readNumber(familySummary?.family_id) ??
    readNumber(row.billing_partner_id) ??
    readNumber(guardian?.billing_partner_id) ??
    readNumber(row.billing_partnerId)
  );
}

function readChildren(row: Record<string, unknown>): FamilyFinanceChild[] {
  const source = row.children ?? row.students ?? row.siblings;
  if (!Array.isArray(source)) return [];
  return source.map(normalizeChild).filter((item): item is FamilyFinanceChild => item != null);
}

export function normalizeFamilyFinanceSummary(raw: unknown): FamilyFinanceSummary | null {
  const row = readRecord(raw);
  if (!row) return null;
  const familyId = readFamilyId(row);
  if (familyId == null) return null;
  const nestedSummary = readRecord(row.summary);
  const metrics = nestedSummary ?? row;
  const guardian = readGuardian(row);
  const children = readChildren(row);
  const displayName =
    readString(row.family_display_name) ??
    readString(row.display_name) ??
    readString(guardian?.billing_partner_name) ??
    readString(row.billing_partner_name) ??
    readString(row.payer_name);
  return {
    family_id: familyId,
    billing_partner_id:
      readNumber(row.billing_partner_id) ??
      readNumber(guardian?.billing_partner_id) ??
      familyId,
    billing_partner_name:
      readString(guardian?.billing_partner_name) ??
      readString(row.billing_partner_name) ??
      displayName,
    display_name: displayName,
    student_count:
      readNumber(metrics.student_count) ??
      readNumber(row.children_count) ??
      readNumber(row.student_count) ??
      (children.length > 0 ? children.length : null),
    total_net_due: normalizeMoneyValue(
      metrics.total_net_due ?? metrics.total_due ?? row.total_net_due ?? row.total_due,
    ),
    total_paid: normalizeMoneyValue(metrics.total_paid ?? metrics.paid ?? row.total_paid),
    total_remaining: normalizeMoneyValue(
      metrics.total_remaining ?? metrics.remaining ?? row.total_remaining,
    ),
    total_overdue: normalizeMoneyValue(metrics.total_overdue ?? metrics.overdue ?? row.total_overdue),
    credit_balance: normalizeMoneyValue(metrics.credit_balance ?? row.credit_balance),
    unallocated_amount: normalizeMoneyValue(
      metrics.unallocated_amount ?? metrics.unallocated ?? row.unallocated_amount,
    ),
    children,
    currency: readString(metrics.currency) ?? readString(row.currency),
  };
}

function normalizeSibling(raw: unknown): FamilyPlanSibling | null {
  const row = readRecord(raw);
  if (!row) return null;
  const studentId = readNumber(row.student_id);
  if (studentId == null) return null;
  return {
    student_id: studentId,
    student_name: readString(row.student_name) ?? readString(row.name),
    has_active_agreement: readBoolean(row.has_active_agreement),
  };
}

export function normalizeFamilyPlanContext(raw: unknown): FamilyPlanContext | null {
  const row = readRecord(raw);
  if (!row) return null;
  const siblings = Array.isArray(row.siblings)
    ? row.siblings.map(normalizeSibling).filter((item): item is FamilyPlanSibling => item != null)
    : [];
  const hint = readRecord(row.eligible_family_discount_hint);
  const activeAgreements = Array.isArray(row.active_agreements) ? row.active_agreements : null;
  const familyOverdueAmount = normalizeMoneyValue(row.family_overdue_amount);
  return {
    family_id: readFamilyId(row),
    sibling_count:
      readNumber(row.sibling_count) ?? (siblings.length > 0 ? siblings.length : null),
    siblings,
    has_active_sibling_agreements:
      readBoolean(row.has_active_sibling_agreements) ??
      (activeAgreements != null ? activeAgreements.length > 0 : null),
    family_has_overdue:
      readBoolean(row.family_has_overdue) ??
      (familyOverdueAmount != null ? familyOverdueAmount > 0 : null),
    eligible_family_discount_hint: hint
      ? {
          eligible: readBoolean(hint.eligible),
          reason: readString(hint.reason) ?? readString(hint.message),
        }
      : null,
  };
}

function normalizeOpenInstallment(raw: unknown): FamilyOpenInstallment | null {
  const row = readRecord(raw);
  if (!row) return null;
  const studentId = readNumber(row.student_id);
  if (studentId == null) return null;
  return {
    student_id: studentId,
    student_name: readString(row.student_name) ?? readString(row.name),
    service_type: readServiceType(row.service_type),
    service_label: readString(row.service_label) ?? readString(row.label),
    due_date: readString(row.due_date),
    remaining_amount: normalizeMoneyValue(row.remaining_amount ?? row.amount_remaining),
    is_overdue: readBoolean(row.is_overdue) ?? readBoolean(row.overdue),
  };
}

export function normalizeFamilyCollectionContext(raw: unknown): FamilyCollectionContext | null {
  const row = readRecord(raw);
  if (!row) return null;
  const openInstallments = Array.isArray(row.open_installments)
    ? row.open_installments
        .map(normalizeOpenInstallment)
        .filter((item): item is FamilyOpenInstallment => item != null)
    : [];
  const familySummary = readRecord(row.family_summary) ?? row;
  return {
    family_id: readFamilyId(row),
    total_remaining: normalizeMoneyValue(
      familySummary.total_remaining ?? row.total_remaining ?? row.remaining,
    ),
    total_overdue: normalizeMoneyValue(
      familySummary.total_overdue ?? row.total_overdue ?? row.overdue,
    ),
    credit_balance: normalizeMoneyValue(familySummary.credit_balance ?? row.credit_balance),
    open_installments: openInstallments,
    currency: readString(familySummary.currency) ?? readString(row.currency),
  };
}

function normalizeAllocation(raw: unknown): FamilyCollectionAllocation | null {
  const row = readRecord(raw);
  if (!row) return null;
  return {
    student_id: readNumber(row.student_id),
    student_name: readString(row.student_name),
    installment_id: readNumber(row.installment_id),
    service_type: row.service_type ? readServiceType(row.service_type) : null,
    service_label: readString(row.service_label) ?? readString(row.label),
    allocated_amount: normalizeMoneyValue(row.allocated_amount ?? row.amount),
    due_date: readString(row.due_date),
  };
}

const ALLOCATION_MODES: FamilyCollectionAllocationMode[] = [
  'oldest_due_first',
  'by_student',
  'by_service',
  'manual',
  'leave_as_family_credit',
];

export function normalizeFamilyCollectionPreviewResponse(
  raw: unknown,
): FamilyCollectionPreviewResponse | null {
  const row = readRecord(raw);
  if (!row) return null;
  const mode = readString(row.allocation_mode);
  const allocations = Array.isArray(row.allocations)
    ? row.allocations
        .map(normalizeAllocation)
        .filter((item): item is FamilyCollectionAllocation => item != null)
    : [];
  const warnings = Array.isArray(row.warnings)
    ? row.warnings.filter((item): item is string => typeof item === 'string')
    : [];
  const errors = Array.isArray(row.errors)
    ? row.errors.filter((item): item is string => typeof item === 'string')
    : [];
  return {
    amount: normalizeMoneyValue(row.amount ?? row.payment_amount),
    allocated_amount: normalizeMoneyValue(row.allocated_amount),
    unallocated_amount: normalizeMoneyValue(row.unallocated_amount),
    credit_amount: normalizeMoneyValue(row.credit_amount),
    credit_balance: normalizeMoneyValue(row.credit_balance),
    allocation_mode:
      mode && ALLOCATION_MODES.includes(mode as FamilyCollectionAllocationMode)
        ? (mode as FamilyCollectionAllocationMode)
        : null,
    allocations,
    warnings,
    errors,
  };
}

function normalizeCollectionRecord(raw: unknown): FamilyCollectionRecord | null {
  const row = readRecord(raw);
  if (!row) return null;
  const id = readNumber(row.id);
  if (id == null) return null;
  return {
    id,
    name: readString(row.name),
    student_id: readNumber(row.student_id),
    amount: normalizeMoneyValue(row.amount),
    state: readString(row.state),
  };
}

function normalizeReceiptRecord(raw: unknown): FamilyCollectionReceiptRecord | null {
  const row = readRecord(raw);
  if (!row) return null;
  const id = readNumber(row.id);
  if (id == null) return null;
  return {
    id,
    name: readString(row.name),
    collection_id: readNumber(row.collection_id),
  };
}

export function normalizeFamilyCollectionCreateResponse(
  raw: unknown,
): FamilyCollectionCreateResponse | null {
  const row = readRecord(raw);
  if (!row) return null;
  const collections = Array.isArray(row.collections)
    ? row.collections
        .map(normalizeCollectionRecord)
        .filter((item): item is FamilyCollectionRecord => item != null)
    : [];
  const receipts = Array.isArray(row.receipts)
    ? row.receipts
        .map(normalizeReceiptRecord)
        .filter((item): item is FamilyCollectionReceiptRecord => item != null)
    : [];
  const warnings = Array.isArray(row.warnings)
    ? row.warnings.filter((item): item is string => typeof item === 'string')
    : [];
  return {
    ok: readBoolean(row.ok) ?? undefined,
    family_id: readFamilyId(row),
    billing_partner_id: readNumber(row.billing_partner_id),
    collections,
    receipts,
    total_received: normalizeMoneyValue(row.total_received),
    total_allocated: normalizeMoneyValue(row.total_allocated),
    total_unallocated: normalizeMoneyValue(row.total_unallocated),
    allocation_mode: readString(row.allocation_mode) as FamilyCollectionAllocationMode | null,
    warnings,
  };
}

export function familyFinanceServiceTypeLabelKey(type: FamilyFinanceServiceType | string): string {
  const map: Record<FamilyFinanceServiceType, string> = {
    tuition: 'admin.student360.familyFinance.services.tuition',
    registration: 'admin.student360.familyFinance.services.registration',
    transport: 'admin.student360.familyFinance.services.transport',
    canteen: 'admin.student360.familyFinance.services.canteen',
    books: 'admin.student360.familyFinance.services.books',
    activities: 'admin.student360.familyFinance.services.activities',
    other: 'admin.student360.familyFinance.services.other',
  };
  return map[type as FamilyFinanceServiceType] ?? map.other;
}

export function familyFinanceErrorMessageKey(code: string | undefined): string {
  switch (code) {
    case 'family_not_resolved':
      return 'admin.student360.familyFinance.errors.notResolved';
    case 'forbidden':
    case 'permission_denied':
      return 'admin.student360.familyFinance.errors.forbidden';
    case 'not_found':
      return 'admin.student360.familyFinance.errors.notFound';
    default:
      return 'admin.student360.familyFinance.errors.loadFailed';
  }
}

export function formatFamilyChildClassLevel(child: FamilyFinanceChild): string | null {
  const parts = [child.level_name, child.class_name, child.section_name].filter(Boolean);
  return parts.length ? parts.join(' · ') : null;
}
