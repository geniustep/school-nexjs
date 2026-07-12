import type { AdmissionsDashboard } from '@/types/admission';
import type { AdmissionOutcomeFilter } from './admission-status-display';

export type DashboardKey = keyof AdmissionsDashboard;

export type AdmissionsDashboardMainFilter =
  | 'awaiting_registration'
  | 'ready_for_registration'
  | 'school_rejected';

export const ADMISSIONS_MAIN_DASHBOARD_CARDS: {
  id: 'active' | AdmissionsDashboardMainFilter;
  countKey: DashboardKey;
  labelKey: string;
  tone: 'blue' | 'amber' | 'green' | 'red';
  interactive: boolean;
  filter?: AdmissionsDashboardMainFilter;
  ariaFilterKey?: string;
  hintKey?: string;
}[] = [
  {
    id: 'active',
    countKey: 'total_open',
    labelKey: 'admin.admissions.dashboard.total_open',
    tone: 'blue',
    interactive: false,
  },
  {
    id: 'awaiting_registration',
    countKey: 'awaiting_registration_count',
    labelKey: 'admin.admissions.registrationStatus.awaiting_registration',
    tone: 'amber',
    interactive: true,
    filter: 'awaiting_registration',
    ariaFilterKey: 'admin.admissions.dashboard.filterAwaitingAria',
  },
  {
    id: 'ready_for_registration',
    countKey: 'confirmed_count',
    labelKey: 'admin.admissions.registrationStatus.ready_for_registration',
    tone: 'green',
    interactive: true,
    filter: 'ready_for_registration',
    ariaFilterKey: 'admin.admissions.dashboard.filterReadyAria',
    hintKey: 'admin.admissions.dashboard.readyHint',
  },
  {
    id: 'school_rejected',
    countKey: 'school_rejected_count',
    labelKey: 'admin.admissions.schoolDecision.rejected',
    tone: 'red',
    interactive: true,
    filter: 'school_rejected',
    ariaFilterKey: 'admin.admissions.dashboard.filterRejectedAria',
  },
];

export function resolveDashboardOutcomeClick(
  active: AdmissionOutcomeFilter,
  next: AdmissionOutcomeFilter,
): AdmissionOutcomeFilter {
  return active === next ? '' : next;
}

export function shouldShowOfferIndicator(count: number | undefined | null): boolean {
  return Number(count ?? 0) > 0;
}
