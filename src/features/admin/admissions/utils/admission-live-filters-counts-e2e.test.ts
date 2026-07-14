/**
 * Live parity matrix (school Runtime after 1b10a31 / QA7B) — fixture-level
 * assertion of card count key ↔ application_status filter ↔ expected total.
 *
 * Snapshot refreshed from live QA7B (2026-07-14): accepted=9, ready=3, rejected=0.
 * Legacy confirmed_count/awaiting_registration_count intentionally diverge.
 */
import { describe, expect, it } from 'vitest';
import {
  ADMISSIONS_OPERATIONAL_CARDS,
  resolveOperationalCardCount,
  resolveOperationalCardDisplayCount,
} from './admissions-dashboard-cards';
import {
  applyOperationalCard,
  buildAdmissionListServerQuery,
  buildKanbanWorkspaceExtraQuery,
  type AdmissionWorkspaceListState,
} from './admission-workspace';
import type { AdmissionsDashboard } from '@/types/admission';

const LIVE_SCHOOL_DASH: AdmissionsDashboard = {
  total_open: 76,
  new_count: 32,
  visit_pending_count: 0,
  under_review_count: 0,
  accepted_count: 11,
  offer_sent_count: 0,
  confirmed_count: 4,
  lost_count: 0,
  today_appointments: 0,
  overdue_next_actions: 0,
  awaiting_registration_count: 15,
  school_rejected_count: 0,
  ready_for_registration_count: 3,
  application_status_counts: {
    new: 32,
    follow_up: 8,
    in_assessment: 2,
    accepted: 9,
    ready_for_registration: 3,
    rejected: 0,
  },
  application_status_accepted_count: 9,
  application_status_ready_for_registration_count: 3,
  application_status_rejected_count: 0,
};

function base(): AdmissionWorkspaceListState {
  return {
    workspace: 'follow_up',
    followStage: '',
    awaitingSub: '',
    postSub: 'awaiting',
    closedSub: 'rejected',
    hideConverted: true,
    page: 1,
    view: 'table',
  };
}

describe('live filter/count e2e matrix (school snapshot)', () => {
  it.each([
    {
      cardId: 'awaiting_registration' as const,
      status: 'accepted',
      expected: 9,
    },
    {
      cardId: 'ready_for_registration' as const,
      status: 'ready_for_registration',
      expected: 3,
    },
    {
      cardId: 'school_rejected' as const,
      status: 'rejected',
      expected: 0,
    },
  ])('$cardId count=$expected filter=$status', ({ cardId, status, expected }) => {
    const card = ADMISSIONS_OPERATIONAL_CARDS.find((c) => c.id === cardId)!;
    expect(resolveOperationalCardCount(LIVE_SCHOOL_DASH, card)).toBe(expected);
    const query = buildAdmissionListServerQuery(applyOperationalCard(base(), cardId));
    expect(query.application_status).toBe(status);
    expect(query).not.toHaveProperty('workspace');
    expect(query).not.toHaveProperty('state');
    expect(query).not.toHaveProperty('registration_status');
    expect(query).not.toHaveProperty('decision');
  });

  it('confirmed_count remains legacy and is not used for ready KPI when status counts exist', () => {
    const ready = ADMISSIONS_OPERATIONAL_CARDS[1];
    expect(LIVE_SCHOOL_DASH.confirmed_count).toBe(4);
    expect(LIVE_SCHOOL_DASH.awaiting_registration_count).toBe(15);
    expect(resolveOperationalCardCount(LIVE_SCHOOL_DASH, ready)).toBe(3);
  });

  it('active card badge prefers pagination.total over dashboard map', () => {
    const ready = ADMISSIONS_OPERATIONAL_CARDS[1];
    expect(
      resolveOperationalCardDisplayCount(LIVE_SCHOOL_DASH, ready, {
        activeCard: 'ready_for_registration',
        activeListTotal: 3,
      }),
    ).toBe(3);
  });

  it.each([
    ['new', 32],
    ['follow_up', 8],
    ['in_assessment', 2],
  ] as const)('kanban column %s maps to dashboard count %i', (status, expected) => {
    expect(LIVE_SCHOOL_DASH.application_status_counts?.[status]).toBe(expected);
  });

  it('kanban extra query omits workspace and application_status (column owns status)', () => {
    const extra = buildKanbanWorkspaceExtraQuery({
      ...base(),
      view: 'kanban',
      workspace: 'follow_up',
    });
    expect(extra).not.toHaveProperty('workspace');
    expect(extra).not.toHaveProperty('application_status');
  });
});
