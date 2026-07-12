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
}[] = [
  {
    id: 'awaiting_registration',
    countKey: 'awaiting_registration_count',
    labelKey: 'admin.admissions.registrationStatus.awaiting_registration',
    tone: 'amber',
    ariaFilterKey: 'admin.admissions.dashboard.filterAwaitingAria',
  },
  {
    id: 'ready_for_registration',
    countKey: 'confirmed_count',
    labelKey: 'admin.admissions.registrationStatus.ready_for_registration',
    tone: 'green',
    ariaFilterKey: 'admin.admissions.dashboard.filterReadyAria',
    hintKey: 'admin.admissions.dashboard.readyHint',
  },
  {
    id: 'school_rejected',
    countKey: 'school_rejected_count',
    labelKey: 'admin.admissions.schoolDecision.rejected',
    tone: 'red',
    ariaFilterKey: 'admin.admissions.dashboard.filterRejectedAria',
  },
];

/** @deprecated Use ADMISSIONS_OPERATIONAL_CARDS — kept for older tests during migration. */
export const ADMISSIONS_MAIN_DASHBOARD_CARDS = [
  {
    id: 'active' as const,
    countKey: 'total_open' as DashboardKey,
    labelKey: 'admin.admissions.dashboard.total_open',
    tone: 'blue' as const,
    interactive: false,
  },
  ...ADMISSIONS_OPERATIONAL_CARDS.map((card) => ({
    ...card,
    interactive: true as const,
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
