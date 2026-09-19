import {
  normalizeMoneyValue,
  parseFinanceList,
} from '@/lib/utils/finance-normalize';
import {
  buildBillingAccountCollectHref,
  normalizeBillingAccountListItem,
} from '@/lib/utils/normalize-billing-account';
import type { BillingAccountListItem } from '@/types/finance-billing-account';
import type {
  ArrearsFamilyFollowupDetail,
  ArrearsGuardianDetail,
  ArrearsGuardianRelationshipContext,
  ArrearsOverdueInstallmentDetail,
  ArrearsStudentDetail,
  ArrearsFollowupLastEntry,
  ArrearsFollowupListItem,
  ArrearsFollowupListResult,
  ArrearsFollowupSummary,
  ArrearsFollowupTab,
  ArrearsMergedRow,
} from '@/types/finance-arrears';

function readString(raw: unknown): string | null {
  return typeof raw === 'string' && raw.trim() ? raw.trim() : null;
}

function readAccountKind(raw: unknown): 'family' | 'individual' | null {
  const value = readString(raw)?.toLowerCase();
  return value === 'family' || value === 'individual' ? value : null;
}

function readNumber(raw: unknown): number | null {
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : null;
}

function readBoolean(raw: unknown): boolean | undefined {
  if (raw === true || raw === false) return raw;
  if (raw === 1) return true;
  if (raw === 0) return false;
  return undefined;
}

function normalizeGuardianRelationshipContext(
  raw: unknown,
): ArrearsGuardianRelationshipContext | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const student_id = readNumber(row.student_id);
  if (student_id == null) return null;
  return {
    student_id,
    relationship_type: readString(row.relationship_type),
    is_primary_contact: readBoolean(row.is_primary_contact),
    is_financial_responsible: readBoolean(row.is_financial_responsible),
    is_legal_guardian: readBoolean(row.is_legal_guardian),
  };
}

function normalizeGuardianDetail(raw: unknown): ArrearsGuardianDetail | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const guardian_id = readNumber(row.guardian_id);
  if (guardian_id == null) return null;
  return {
    guardian_id,
    partner_id: readNumber(row.partner_id),
    name: readString(row.name) ?? undefined,
    is_billing_partner: readBoolean(row.is_billing_partner),
    relationship_contexts: Array.isArray(row.relationship_contexts)
      ? row.relationship_contexts
          .map(normalizeGuardianRelationshipContext)
          .filter((item): item is ArrearsGuardianRelationshipContext => item != null)
      : [],
  };
}

function normalizeStudentDetail(raw: unknown): ArrearsStudentDetail | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const student_id = readNumber(row.student_id);
  if (student_id == null) return null;
  return {
    student_id,
    student_name: readString(row.student_name) ?? undefined,
    student_code: readString(row.student_code),
    class: row.class,
    level: row.level,
    gross_overdue_amount: normalizeMoneyValue(row.gross_overdue_amount) ?? undefined,
    pending_cheque_coverage_amount: normalizeMoneyValue(row.pending_cheque_coverage_amount) ?? undefined,
    actionable_overdue_amount: normalizeMoneyValue(row.actionable_overdue_amount) ?? undefined,
  };
}

function normalizeOverdueInstallmentDetail(raw: unknown): ArrearsOverdueInstallmentDetail | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const installment_id = readNumber(row.installment_id);
  const student_id = readNumber(row.student_id);
  if (installment_id == null || student_id == null) return null;
  return {
    installment_id,
    student_id,
    student_name: readString(row.student_name) ?? undefined,
    student_code: readString(row.student_code),
    fee_id: readNumber(row.fee_id),
    fee_type_id: readNumber(row.fee_type_id),
    fee_type_name: readString(row.fee_type_name),
    period_key: readString(row.period_key),
    period_start: readString(row.period_start),
    period_end: readString(row.period_end),
    due_date: readString(row.due_date),
    gross_overdue_amount: normalizeMoneyValue(row.gross_overdue_amount) ?? undefined,
    pending_cheque_coverage_amount: normalizeMoneyValue(row.pending_cheque_coverage_amount) ?? undefined,
    actionable_overdue_amount: normalizeMoneyValue(row.actionable_overdue_amount) ?? undefined,
  };
}

function readFamilyId(row: Record<string, unknown>): number | null {
  const candidates = [
    row.family_id,
    row.billing_partner_id,
    row.billing_partnerId,
    row.partner_id,
  ];
  for (const value of candidates) {
    if (typeof value === 'number' && !Number.isNaN(value)) return value;
  }
  const partner = row.billing_partner ?? row.family ?? row.partner;
  if (partner && typeof partner === 'object') {
    const id = (partner as Record<string, unknown>).id;
    if (typeof id === 'number' && !Number.isNaN(id)) return id;
  }
  if (typeof row.id === 'number' && !Number.isNaN(row.id)) return row.id;
  return null;
}

function readSummary(raw: Record<string, unknown>): ArrearsFollowupSummary {
  const nested = raw.summary && typeof raw.summary === 'object' ? (raw.summary as Record<string, unknown>) : raw;
  const kpis = raw.kpis && typeof raw.kpis === 'object' ? (raw.kpis as Record<string, unknown>) : nested;
  return {
    overdue_accounts_count:
      typeof kpis.overdue_accounts_count === 'number'
        ? kpis.overdue_accounts_count
        : undefined,
    overdue_families_count:
      typeof kpis.overdue_families_count === 'number'
        ? kpis.overdue_families_count
        : typeof kpis.families_overdue_count === 'number'
          ? kpis.families_overdue_count
          : typeof kpis.overdue_count === 'number'
            ? kpis.overdue_count
            : undefined,
    total_overdue_amount:
      normalizeMoneyValue(kpis.total_overdue_amount) ??
      normalizeMoneyValue(kpis.total_overdue) ??
      undefined,
    actionable_overdue_accounts_count:
      typeof kpis.actionable_overdue_accounts_count === 'number'
        ? kpis.actionable_overdue_accounts_count
        : undefined,
    total_actionable_overdue_amount:
      normalizeMoneyValue(kpis.total_actionable_overdue_amount) ?? undefined,
    total_pending_cheque_coverage_on_overdue:
      normalizeMoneyValue(kpis.total_pending_cheque_coverage_on_overdue) ?? undefined,
    payment_promises_count:
      typeof kpis.payment_promises_count === 'number'
        ? kpis.payment_promises_count
        : typeof kpis.promises_count === 'number'
          ? kpis.promises_count
          : undefined,
    today_followups_count:
      typeof kpis.today_followups_count === 'number'
        ? kpis.today_followups_count
        : typeof kpis.followups_today_count === 'number'
          ? kpis.followups_today_count
          : undefined,
  };
}

export function normalizeArrearsFollowupListItem(raw: unknown): ArrearsFollowupListItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const family_id = readFamilyId(row);
  if (family_id == null) return null;

  const billing = normalizeBillingAccountListItem(row);
  const partner = row.billing_partner ?? row.family ?? row.partner;
  const partnerName =
    billing?.display_name ??
    (partner && typeof partner === 'object'
      ? readString((partner as Record<string, unknown>).display_name) ??
        readString((partner as Record<string, unknown>).name)
      : null);

  return {
    family_id,
    billing_partner_id: family_id,
    account_kind:
      readAccountKind(row.account_kind) ??
      readAccountKind(billing?.account_kind) ??
      null,
    family_name:
      readString(row.family_name) ??
      readString(row.display_name) ??
      partnerName ??
      undefined,
    guardian_name:
      readString(row.guardian_name) ??
      readString(row.parent_name) ??
      readString(row.payer_name) ??
      undefined,
    display_name: partnerName ?? readString(row.display_name) ?? undefined,
    student_count:
      typeof row.student_count === 'number'
        ? row.student_count
        : billing?.student_count,
    total_overdue:
      normalizeMoneyValue(row.total_overdue) ?? billing?.total_overdue ?? undefined,
    gross_overdue_amount:
      normalizeMoneyValue(row.gross_overdue_amount) ?? undefined,
    pending_cheque_coverage_amount:
      normalizeMoneyValue(row.pending_cheque_coverage_amount) ?? undefined,
    actionable_overdue_amount:
      normalizeMoneyValue(row.actionable_overdue_amount) ?? undefined,
    pending_cheque_amount:
      normalizeMoneyValue(row.pending_cheque_amount) ?? undefined,
    total_remaining:
      normalizeMoneyValue(row.total_remaining) ?? billing?.total_remaining ?? undefined,
    oldest_overdue_date:
      readString(row.oldest_overdue_date) ??
      readString(row.oldest_overdue) ??
      readString(row.first_overdue_date),
    followup_status: readString(row.followup_status) ?? readString(row.status),
    followup_status_label:
      readString(row.followup_status_label) ??
      readString(row.status_label) ??
      readString(row.state_label),
    payment_promise_date:
      readString(row.payment_promise_date) ?? readString(row.promise_date),
    payment_promise_amount:
      normalizeMoneyValue(row.payment_promise_amount) ??
      normalizeMoneyValue(row.promise_amount) ??
      undefined,
    next_followup_date:
      readString(row.next_followup_date) ?? readString(row.followup_date),
    assigned_user_id:
      typeof row.assigned_user_id === 'number'
        ? row.assigned_user_id
        : typeof row.user_id === 'number'
          ? row.user_id
          : null,
    assigned_user_name:
      readString(row.assigned_user_name) ??
      readString(row.user_name) ??
      readString(row.assigned_to_name),
    currency: row.currency ?? billing?.currency,
    guardians: Array.isArray(row.guardians)
      ? row.guardians.map(normalizeGuardianDetail).filter((item): item is ArrearsGuardianDetail => item != null)
      : undefined,
    students: Array.isArray(row.students)
      ? row.students.map(normalizeStudentDetail).filter((item): item is ArrearsStudentDetail => item != null)
      : undefined,
    overdue_installments: Array.isArray(row.overdue_installments)
      ? row.overdue_installments
          .map(normalizeOverdueInstallmentDetail)
          .filter((item): item is ArrearsOverdueInstallmentDetail => item != null)
      : undefined,
  };
}

export function normalizeArrearsFollowupList(data: unknown): ArrearsFollowupListItem[] {
  return parseFinanceList<unknown>(data)
    .map(normalizeArrearsFollowupListItem)
    .filter((row): row is ArrearsFollowupListItem => row != null);
}

export function parseArrearsFollowupListResponse(
  data: unknown,
  tab?: ArrearsFollowupTab | null,
): ArrearsFollowupListResult {
  if (!data || typeof data !== 'object') {
    return { items: normalizeArrearsFollowupList(data), summary: null, appliedTab: tab ?? null };
  }
  const row = data as Record<string, unknown>;
  const items = normalizeArrearsFollowupList(row.items ?? row.families ?? row.results ?? row);
  const appliedRaw = row.applied_filters ?? row.applied_tab ?? row.tab;
  const appliedTab =
    typeof appliedRaw === 'string'
      ? (appliedRaw as ArrearsFollowupTab)
      : appliedRaw && typeof appliedRaw === 'object'
        ? readString((appliedRaw as Record<string, unknown>).tab as string) as ArrearsFollowupTab | null
        : tab ?? null;
  return {
    items,
    summary: readSummary(row),
    appliedTab,
  };
}

function normalizeLastFollowup(raw: unknown): ArrearsFollowupLastEntry | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  return {
    id: typeof row.id === 'number' ? row.id : undefined,
    date: readString(row.date) ?? readString(row.occurred_at),
    occurred_at: readString(row.occurred_at) ?? readString(row.date),
    contact_method: readString(row.contact_method),
    contact_method_label: readString(row.contact_method_label),
    contact_result: readString(row.contact_result),
    contact_result_label: readString(row.contact_result_label),
    contact_notes: readString(row.contact_notes) ?? readString(row.notes),
    notes: readString(row.notes) ?? readString(row.contact_notes),
    followup_type: readString(row.followup_type) ?? readString(row.type),
    followup_type_label: readString(row.followup_type_label) ?? readString(row.type_label),
    promise_date: readString(row.promise_date) ?? readString(row.payment_promise_date),
    promise_amount:
      normalizeMoneyValue(row.promise_amount) ??
      normalizeMoneyValue(row.payment_promise_amount) ??
      undefined,
    next_followup_date: readString(row.next_followup_date),
    user_name: readString(row.user_name) ?? readString(row.created_by_name),
  };
}

export function normalizeArrearsFamilyFollowupDetail(raw: unknown): ArrearsFamilyFollowupDetail | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const family_id = readFamilyId(row);
  if (family_id == null) return null;

  const listItem = normalizeArrearsFollowupListItem(row);
  const lastRaw =
    row.last_followup ??
    row.latest_followup ??
    row.last_contact ??
    (Array.isArray(row.recent_followups) ? row.recent_followups[0] : null);

  return {
    family_id,
    family_name: listItem?.family_name,
    guardian_name: listItem?.guardian_name,
    display_name: listItem?.display_name,
    student_count: listItem?.student_count,
    total_overdue: listItem?.total_overdue,
    gross_overdue_amount: listItem?.gross_overdue_amount,
    pending_cheque_coverage_amount: listItem?.pending_cheque_coverage_amount,
    actionable_overdue_amount: listItem?.actionable_overdue_amount,
    total_remaining: listItem?.total_remaining,
    currency: listItem?.currency,
    followup_status: listItem?.followup_status ?? null,
    followup_status_label: listItem?.followup_status_label ?? null,
    payment_promise_date: listItem?.payment_promise_date ?? null,
    payment_promise_amount: listItem?.payment_promise_amount ?? null,
    next_followup_date: listItem?.next_followup_date ?? null,
    guardians: listItem?.guardians,
    students: listItem?.students,
    overdue_installments: listItem?.overdue_installments,
    last_followup: normalizeLastFollowup(lastRaw),
    open_followup_id:
      typeof row.open_followup_id === 'number'
        ? row.open_followup_id
        : typeof row.followup_id === 'number'
          ? row.followup_id
          : null,
    can_resolve:
      row.can_resolve === true ||
      row.can_resolve === 1 ||
      readString(row.followup_status) === 'open' ||
      readString(row.followup_status) === 'needs_followup' ||
      readString(row.followup_status) === 'payment_promise' ||
      readString(row.followup_status) === 'escalated',
  };
}

export function mergeArrearsRows(
  billingRows: BillingAccountListItem[],
  followupRows: ArrearsFollowupListItem[],
): ArrearsMergedRow[] {
  const followupByFamily = new Map<number, ArrearsFollowupListItem>();
  for (const row of followupRows) {
    followupByFamily.set(row.family_id, row);
  }

  return billingRows.map((billing) => {
    const familyId = billing.billing_partner_id;
    const followup = followupByFamily.get(familyId);
    const displayName =
      billing.display_name ??
      (billing.billing_partner && typeof billing.billing_partner === 'object'
        ? readString((billing.billing_partner as Record<string, unknown>).display_name) ??
          readString((billing.billing_partner as Record<string, unknown>).name)
        : null) ??
      undefined;

    return {
      family_id: familyId,
      billing_partner_id: familyId,
      account_kind:
        followup?.account_kind ??
        readAccountKind(billing.account_kind) ??
        null,
      family_name: followup?.family_name ?? displayName,
      guardian_name: followup?.guardian_name ?? displayName,
      display_name: displayName ?? followup?.display_name,
      student_count: followup?.student_count ?? billing.student_count,
      total_overdue: followup?.total_overdue ?? billing.total_overdue,
      gross_overdue_amount: followup?.gross_overdue_amount,
      pending_cheque_coverage_amount: followup?.pending_cheque_coverage_amount,
      actionable_overdue_amount: followup?.actionable_overdue_amount,
      pending_cheque_amount: followup?.pending_cheque_amount,
      total_remaining: followup?.total_remaining ?? billing.total_remaining,
      oldest_overdue_date: followup?.oldest_overdue_date ?? null,
      followup_status: followup?.followup_status ?? null,
      followup_status_label: followup?.followup_status_label ?? null,
      payment_promise_date: followup?.payment_promise_date ?? null,
      payment_promise_amount: followup?.payment_promise_amount ?? null,
      next_followup_date: followup?.next_followup_date ?? null,
      assigned_user_id: followup?.assigned_user_id ?? null,
      assigned_user_name: followup?.assigned_user_name ?? null,
      currency: followup?.currency ?? billing.currency,
    };
  });
}

export function filterMergedRowsByTab(
  rows: ArrearsMergedRow[],
  tab: ArrearsFollowupTab,
  followupFamilyIds: Set<number>,
): ArrearsMergedRow[] {
  if (tab === 'all') return rows;
  if (followupFamilyIds.size > 0) {
    return rows.filter((row) => followupFamilyIds.has(row.family_id));
  }
  return rows.filter((row) => {
    const status = (row.followup_status ?? '').toLowerCase();
    switch (tab) {
      case 'needs_followup':
        return status === 'needs_followup' || status === 'open' || !status;
      case 'payment_promises':
        return status === 'payment_promise' || status === 'payment_promise' || !!row.payment_promise_date;
      case 'today_followup':
        return !!row.next_followup_date;
      case 'escalated':
        return status === 'escalated';
      case 'resolved':
        return status === 'resolved' || status === 'closed';
      case 'pending_cheque':
        return false;
      default:
        return true;
    }
  });
}

/**
 * KPI values are authoritative only when supplied by the backend summary.
 * The rows argument is intentionally ignored because the visible list is paginated
 * and must never be aggregated into financial KPIs.
 */
export function computeArrearsSummaryFromRows(
  _rows: ArrearsMergedRow[],
  apiSummary: ArrearsFollowupSummary | null,
): ArrearsFollowupSummary {
  return apiSummary ? { ...apiSummary } : {};
}

export function buildFamilyCollectHref(
  familyId: number,
  returnTo: string,
  options?: {
    suggestedAmount?: number | null;
    source?: 'arrears';
  },
): string {
  const params = new URLSearchParams();
  params.set('family_collect', '1');
  if (returnTo) params.set('returnTo', returnTo);
  if (options?.source === 'arrears') params.set('source', 'arrears');
  if (options?.suggestedAmount != null && options.suggestedAmount > 0) {
    params.set('suggested_amount', String(options.suggestedAmount));
  }
  return `/admin/finance/billing-accounts/${familyId}?${params.toString()}`;
}

export function arrearsBillingPartnerId(row: ArrearsFollowupListItem): number {
  return row.billing_partner_id ?? row.family_id;
}

export function buildArrearsCollectHref(
  row: ArrearsFollowupListItem,
  returnTo: string,
): string {
  const billingPartnerId = arrearsBillingPartnerId(row);
  const suggestedAmount = row.actionable_overdue_amount ?? row.total_overdue;
  if (row.account_kind === 'individual') {
    const href = buildBillingAccountCollectHref(billingPartnerId, returnTo);
    if (suggestedAmount != null && suggestedAmount > 0) {
      return `${href}&suggested_amount=${encodeURIComponent(String(suggestedAmount))}`;
    }
    return href;
  }
  return buildFamilyCollectHref(billingPartnerId, returnTo, {
    source: 'arrears',
    suggestedAmount,
  });
}

export function buildBillingAccountHref(familyId: number, returnTo: string): string {
  if (!returnTo) return `/admin/finance/billing-accounts/${familyId}`;
  return `/admin/finance/billing-accounts/${familyId}?returnTo=${encodeURIComponent(returnTo)}`;
}
