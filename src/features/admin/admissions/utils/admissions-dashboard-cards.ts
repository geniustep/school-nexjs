import type { AdmissionsDashboard } from '@/types/admission';

export type DashboardKey = keyof AdmissionsDashboard;

export type AdmissionsOperationalCardId =
  | 'awaiting_registration'
  | 'ready_for_registration'
  | 'school_rejected';

export const ADMISSIONS_OPERATIONAL_CARDS: {
  id: AdmissionsOperationalCardId;
  countKey: DashboardKey;
  labelKey: string;
  tone: 'amber' | 'green' | 'red';
  ariaFilterKey: string;
  hintKey?: string;
  /** Official application_status applied when the card is pressed. */
  applicationStatus: 'accepted' | 'ready_for_registration' | 'rejected';
}[] = [
  {
    id: 'awaiting_registration',
    // Flat count key is a display fallback; prefer application_status_accepted_count.
    countKey: 'application_status_accepted_count',
    labelKey: 'admin.admissions.registrationStatus.awaiting_registration',
    tone: 'amber',
    ariaFilterKey: 'admin.admissions.dashboard.filterAwaitingAria',
    applicationStatus: 'accepted',
  },
  {
    id: 'ready_for_registration',
    countKey: 'application_status_ready_for_registration_count',
    labelKey: 'admin.admissions.applicationStatus.ready_for_registration',
    tone: 'green',
    ariaFilterKey: 'admin.admissions.dashboard.filterReadyAria',
    hintKey: 'admin.admissions.dashboard.readyHint',
    applicationStatus: 'ready_for_registration',
  },
  {
    id: 'school_rejected',
    countKey: 'application_status_rejected_count',
    labelKey: 'admin.admissions.applicationStatus.rejected',
    tone: 'red',
    ariaFilterKey: 'admin.admissions.dashboard.filterRejectedAria',
    applicationStatus: 'rejected',
  },
];

/** True when dashboard payload exposes modern application_status tallies. */
export function dashboardHasModernStatusCounts(data: AdmissionsDashboard): boolean {
  const map = data.application_status_counts;
  if (map && typeof map === 'object' && Object.keys(map).length > 0) return true;
  return (
    typeof data.application_status_accepted_count === 'number' ||
    typeof data.application_status_ready_for_registration_count === 'number' ||
    typeof data.application_status_rejected_count === 'number' ||
    typeof data.ready_for_registration_count === 'number'
  );
}

/** Read official application_status tally from dashboard payload. */
export function resolveApplicationStatusCount(
  data: AdmissionsDashboard,
  status: string,
): number | null {
  const map = data.application_status_counts;
  if (map && typeof map[status] === 'number') return Number(map[status]);

  const flatKey = `application_status_${status}_count` as keyof AdmissionsDashboard;
  const flat = data[flatKey];
  if (typeof flat === 'number') return flat;

  if (status === 'ready_for_registration' && typeof data.ready_for_registration_count === 'number') {
    return data.ready_for_registration_count;
  }
  return null;
}

/**
 * KPI card count must match the application_status filter the card applies.
 * Modern application_status_* only — never confirmed_count / awaiting_registration_count.
 */
export function resolveOperationalCardCount(
  data: AdmissionsDashboard,
  card: (typeof ADMISSIONS_OPERATIONAL_CARDS)[number],
): number {
  const statusCount = resolveApplicationStatusCount(data, card.applicationStatus);
  return statusCount != null ? statusCount : 0;
}

/**
 * Prefer list pagination.total only when it is settled and scoped to the same
 * application_status as the pressed KPI card — never while a prior filter's
 * total is still in memory.
 */
export function resolveTrustedActiveListTotal(options: {
  activeCard: AdmissionsOperationalCardId | null;
  serverApplicationStatus?: string | null;
  paginationTotal?: number | null;
  /** False while table request for the current filter is in flight. */
  listSettled: boolean;
  view?: 'table' | 'kanban';
}): number | null {
  const card = ADMISSIONS_OPERATIONAL_CARDS.find((c) => c.id === options.activeCard);
  if (!card) return null;
  if (options.view != null && options.view !== 'table') return null;
  if (!options.listSettled) return null;
  if (options.serverApplicationStatus !== card.applicationStatus) return null;
  if (typeof options.paginationTotal !== 'number') return null;
  return options.paginationTotal;
}

/**
 * While a KPI filter is active and the matching list total is trusted,
 * overlay that total so the badge matches the visible result set.
 */
export function resolveOperationalCardDisplayCount(
  data: AdmissionsDashboard,
  card: (typeof ADMISSIONS_OPERATIONAL_CARDS)[number],
  options?: {
    activeCard?: AdmissionsOperationalCardId | null;
    activeListTotal?: number | null;
  },
): number {
  if (
    options?.activeCard === card.id &&
    typeof options.activeListTotal === 'number'
  ) {
    return options.activeListTotal;
  }
  return resolveOperationalCardCount(data, card);
}

/** @deprecated Use ADMISSIONS_OPERATIONAL_CARDS — kept for older tests during migration. */
export const ADMISSIONS_MAIN_DASHBOARD_CARDS: Array<{
  id: string;
  countKey: DashboardKey;
  labelKey: string;
  tone: 'blue' | 'amber' | 'green' | 'red';
  interactive: boolean;
  filter?: AdmissionsOperationalCardId;
  ariaFilterKey?: string;
  hintKey?: string;
}> = [
  {
    id: 'active',
    countKey: 'total_open',
    labelKey: 'admin.admissions.dashboard.total_open',
    tone: 'blue',
    interactive: false,
  },
  ...ADMISSIONS_OPERATIONAL_CARDS.map((card) => ({
    ...card,
    interactive: true,
    filter: card.id,
  })),
];

export type AdmissionsInfoIndicatorId =
  | 'active'
  | 'new'
  | 'needs_follow_up'
  | 'today_appointments';

export const ADMISSIONS_INFO_INDICATORS: {
  id: AdmissionsInfoIndicatorId;
  countKey: DashboardKey;
  labelKey: string;
}[] = [
  {
    id: 'active',
    countKey: 'total_open',
    labelKey: 'admin.admissions.dashboard.total_open',
  },
  {
    id: 'new',
    countKey: 'new_count',
    labelKey: 'admin.admissions.dashboard.new_count',
  },
  {
    id: 'needs_follow_up',
    countKey: 'overdue_next_actions',
    labelKey: 'admin.admissions.dashboard.overdue_next_actions',
  },
  {
    id: 'today_appointments',
    countKey: 'today_appointments',
    labelKey: 'admin.admissions.dashboard.today_appointments',
  },
];

/** Resolve informational strip values; prefer modern status map for `new`. */
export function resolveInfoIndicatorCount(
  data: AdmissionsDashboard,
  item: (typeof ADMISSIONS_INFO_INDICATORS)[number],
): number {
  if (item.id === 'new') {
    const fromStatus = resolveApplicationStatusCount(data, 'new');
    if (fromStatus != null) return fromStatus;
  }
  return Number(data[item.countKey] ?? 0);
}

export function resolveOperationalCardPressed(
  activeCard: AdmissionsOperationalCardId | null,
  card: AdmissionsOperationalCardId,
): boolean {
  return activeCard === card;
}

export function shouldShowOfferIndicator(count: number | undefined | null): boolean {
  return Number(count ?? 0) > 0;
}

/** @deprecated Outcome toggle helper — prefer workspace applyOperationalCard. */
export function resolveDashboardOutcomeClick<T extends string>(
  active: T | '',
  next: T,
): T | '' {
  return active === next ? '' : next;
}
