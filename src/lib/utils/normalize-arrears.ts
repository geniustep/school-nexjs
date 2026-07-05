import {
  normalizeMoneyValue,
  parseFinanceList,
} from '@/lib/utils/finance-normalize';
import { normalizeBillingAccountListItem } from '@/lib/utils/normalize-billing-account';
import type { BillingAccountListItem } from '@/types/finance-billing-account';
import type {
  ArrearsFamilyFollowupDetail,
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
    total_remaining: listItem?.total_remaining,
    currency: listItem?.currency,
    followup_status: listItem?.followup_status ?? null,
    followup_status_label: listItem?.followup_status_label ?? null,
    payment_promise_date: listItem?.payment_promise_date ?? null,
    payment_promise_amount: listItem?.payment_promise_amount ?? null,
    next_followup_date: listItem?.next_followup_date ?? null,
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
      family_name: followup?.family_name ?? displayName,
      guardian_name: followup?.guardian_name ?? displayName,
      display_name: displayName ?? followup?.display_name,
      student_count: followup?.student_count ?? billing.student_count,
      total_overdue: followup?.total_overdue ?? billing.total_overdue,
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
      default:
        return true;
    }
  });
}

export function computeArrearsSummaryFromRows(
  rows: ArrearsMergedRow[],
  apiSummary: ArrearsFollowupSummary | null,
): ArrearsFollowupSummary {
  if (apiSummary?.overdue_families_count != null || apiSummary?.total_overdue_amount != null) {
    return {
      overdue_families_count: apiSummary.overdue_families_count ?? rows.length,
      total_overdue_amount:
        apiSummary.total_overdue_amount ??
        rows.reduce((sum, row) => sum + (row.total_overdue ?? 0), 0),
      payment_promises_count:
        apiSummary.payment_promises_count ??
        rows.filter((row) => row.payment_promise_date || row.payment_promise_amount).length,
      today_followups_count:
        apiSummary.today_followups_count ??
        rows.filter((row) => row.next_followup_date).length,
    };
  }
  const today = new Date().toISOString().slice(0, 10);
  return {
    overdue_families_count: rows.length,
    total_overdue_amount: rows.reduce((sum, row) => sum + (row.total_overdue ?? 0), 0),
    payment_promises_count: rows.filter((row) => row.payment_promise_date || row.payment_promise_amount).length,
    today_followups_count: rows.filter((row) => row.next_followup_date?.slice(0, 10) === today).length,
  };
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

export function buildBillingAccountHref(familyId: number, returnTo: string): string {
  if (!returnTo) return `/admin/finance/billing-accounts/${familyId}`;
  return `/admin/finance/billing-accounts/${familyId}?returnTo=${encodeURIComponent(returnTo)}`;
}
