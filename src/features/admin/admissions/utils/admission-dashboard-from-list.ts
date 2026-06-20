import type { AdmissionListItem, AdmissionsDashboard } from '@/types/admission';
import { isOverdueNextAction } from './admission-labels';

const CLOSED_STATES = new Set(['lost', 'cancelled', 'duplicate']);

function countByState(items: AdmissionListItem[], state: string): number {
  return items.filter((item) => item.state === state).length;
}

/** Approximate dashboard metrics from the currently loaded list (e.g. when API dashboard fails). */
export function buildAdmissionsDashboardFromList(
  items: AdmissionListItem[],
): AdmissionsDashboard {
  const openItems = items.filter((item) => !CLOSED_STATES.has(item.state));

  return {
    total_open: openItems.length,
    new_count: countByState(items, 'new'),
    visit_pending_count: countByState(items, 'visit_pending'),
    under_review_count: countByState(items, 'under_review'),
    accepted_count: countByState(items, 'accepted'),
    offer_sent_count: countByState(items, 'offer_sent'),
    confirmed_count: countByState(items, 'confirmed'),
    lost_count: countByState(items, 'lost'),
    today_appointments: 0,
    overdue_next_actions: openItems.filter((item) =>
      isOverdueNextAction(item.next_action_date),
    ).length,
  };
}
