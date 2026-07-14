import { describe, expect, it } from 'vitest';
import {
  ADMISSIONS_MAIN_DASHBOARD_CARDS,
  ADMISSIONS_OPERATIONAL_CARDS,
  resolveApplicationStatusCount,
  resolveDashboardOutcomeClick,
  resolveOperationalCardCount,
  resolveOperationalCardDisplayCount,
  resolveTrustedActiveListTotal,
  shouldShowOfferIndicator,
} from './admissions-dashboard-cards';
import {
  applyOperationalCard,
  buildAdmissionListServerQuery,
  type AdmissionWorkspaceListState,
} from './admission-workspace';
import type { AdmissionsDashboard } from '@/types/admission';

function baseState(
  patch: Partial<AdmissionWorkspaceListState> = {},
): AdmissionWorkspaceListState {
  return {
    workspace: 'follow_up',
    followStage: '',
    awaitingSub: '',
    postSub: 'awaiting',
    closedSub: 'rejected',
    hideConverted: true,
    page: 1,
    view: 'kanban',
    ...patch,
  };
}

const liveDash: AdmissionsDashboard = {
  total_open: 76,
  new_count: 33,
  visit_pending_count: 0,
  under_review_count: 0,
  accepted_count: 11,
  offer_sent_count: 0,
  confirmed_count: 3,
  lost_count: 0,
  today_appointments: 0,
  overdue_next_actions: 0,
  awaiting_registration_count: 14,
  school_rejected_count: 0,
  ready_for_registration_count: 2,
  application_status_counts: {
    new: 33,
    follow_up: 8,
    in_assessment: 2,
    decision_pending: 4,
    accepted: 9,
    ready_for_registration: 2,
    registered: 18,
    waitlisted: 0,
    rejected: 0,
    closed: 0,
  },
  application_status_accepted_count: 9,
  application_status_ready_for_registration_count: 2,
  application_status_rejected_count: 0,
};

describe('AdmissionsDashboardSummary card contracts', () => {
  it('defines exactly four main cards', () => {
    expect(ADMISSIONS_MAIN_DASHBOARD_CARDS).toHaveLength(4);
  });

  it('has no registered main card', () => {
    expect(ADMISSIONS_MAIN_DASHBOARD_CARDS.some((c) => c.id === 'registered' as never)).toBe(
      false,
    );
    expect(
      ADMISSIONS_MAIN_DASHBOARD_CARDS.some((c) => c.countKey === 'registered_count'),
    ).toBe(false);
  });

  it('ready card filters application_status only and counts match status tally', () => {
    const ready = ADMISSIONS_OPERATIONAL_CARDS[1];
    expect(ready.applicationStatus).toBe('ready_for_registration');
    const query = buildAdmissionListServerQuery(applyOperationalCard(baseState(), ready.id));
    expect(query.application_status).toBe('ready_for_registration');
    expect(query).not.toHaveProperty('state');
    expect(query).not.toHaveProperty('workspace');
    expect(resolveOperationalCardCount(liveDash, ready)).toBe(2);
    expect(resolveApplicationStatusCount(liveDash, 'ready_for_registration')).toBe(2);
  });

  it('awaiting card uses accepted status count (not awaiting_registration_count)', () => {
    const awaiting = ADMISSIONS_OPERATIONAL_CARDS[0];
    expect(awaiting.applicationStatus).toBe('accepted');
    expect(resolveOperationalCardCount(liveDash, awaiting)).toBe(9);
    expect(resolveOperationalCardCount(liveDash, awaiting)).not.toBe(
      liveDash.awaiting_registration_count,
    );
    expect(
      buildAdmissionListServerQuery(applyOperationalCard(baseState(), awaiting.id)),
    ).toEqual({ application_status: 'accepted', hide_registered: 1, page: 1 });
  });

  it('rejected card uses rejected status count', () => {
    const rejected = ADMISSIONS_OPERATIONAL_CARDS[2];
    expect(resolveOperationalCardCount(liveDash, rejected)).toBe(0);
    expect(
      buildAdmissionListServerQuery(applyOperationalCard(baseState(), rejected.id)),
    ).toEqual({ application_status: 'rejected', hide_registered: 1, page: 1 });
  });

  it('active card is informational only', () => {
    const active = ADMISSIONS_MAIN_DASHBOARD_CARDS[0];
    expect(active.id).toBe('active');
    expect(active.interactive).toBe(false);
    expect(active.filter).toBeUndefined();
  });

  it('interactive cards have filters and aria keys', () => {
    const interactive = ADMISSIONS_MAIN_DASHBOARD_CARDS.filter((c) => c.interactive);
    expect(interactive).toHaveLength(3);
    for (const card of interactive) {
      expect(card.filter).toBeTruthy();
      expect(card.ariaFilterKey).toBeTruthy();
    }
  });

  it('awaiting / ready / rejected KPI queries are not mixed', () => {
    expect(ADMISSIONS_OPERATIONAL_CARDS[0].applicationStatus).toBe('accepted');
    expect(ADMISSIONS_OPERATIONAL_CARDS[1].applicationStatus).toBe('ready_for_registration');
    expect(ADMISSIONS_OPERATIONAL_CARDS[2].applicationStatus).toBe('rejected');
  });

  it('toggles outcome filter on repeated click', () => {
    expect(resolveDashboardOutcomeClick('', 'ready_for_registration')).toBe(
      'ready_for_registration',
    );
    expect(
      resolveDashboardOutcomeClick('ready_for_registration', 'ready_for_registration'),
    ).toBe('');
  });

  it('offer indicators only when count > 0', () => {
    expect(shouldShowOfferIndicator(0)).toBe(false);
    expect(shouldShowOfferIndicator(2)).toBe(true);
  });

  it('active list total overlays badge while filter is pressed', () => {
    const ready = ADMISSIONS_OPERATIONAL_CARDS[1];
    expect(
      resolveOperationalCardDisplayCount(liveDash, ready, {
        activeCard: 'ready_for_registration',
        activeListTotal: 2,
      }),
    ).toBe(2);
    expect(resolveOperationalCardDisplayCount(liveDash, ready, {})).toBe(2);
  });

  it('never falls back to confirmed_count when modern status surface exists', () => {
    const ready = ADMISSIONS_OPERATIONAL_CARDS[1];
    const partial: AdmissionsDashboard = {
      ...liveDash,
      application_status_counts: { accepted: 9 },
      application_status_ready_for_registration_count: undefined,
      ready_for_registration_count: undefined,
      confirmed_count: 99,
    };
    expect(resolveOperationalCardCount(partial, ready)).toBe(0);
    expect(resolveOperationalCardCount(partial, ready)).not.toBe(99);
  });

  it('never uses awaiting_registration_count for accepted card', () => {
    const awaiting = ADMISSIONS_OPERATIONAL_CARDS[0];
    const onlyLegacy: AdmissionsDashboard = {
      ...liveDash,
      application_status_counts: undefined,
      application_status_accepted_count: undefined,
      awaiting_registration_count: 77,
      accepted_count: 11,
    };
    expect(resolveOperationalCardCount(onlyLegacy, awaiting)).toBe(0);
  });

  it('never uses confirmed_count for ready card when modern keys absent', () => {
    const ready = ADMISSIONS_OPERATIONAL_CARDS[1];
    const onlyLegacy: AdmissionsDashboard = {
      ...liveDash,
      application_status_counts: undefined,
      application_status_ready_for_registration_count: undefined,
      ready_for_registration_count: undefined,
      confirmed_count: 55,
    };
    expect(resolveOperationalCardCount(onlyLegacy, ready)).toBe(0);
  });

  it('trusted list total only when settled and status matches card', () => {
    expect(
      resolveTrustedActiveListTotal({
        activeCard: 'ready_for_registration',
        serverApplicationStatus: 'ready_for_registration',
        paginationTotal: 3,
        listSettled: true,
        view: 'table',
      }),
    ).toBe(3);
    expect(
      resolveTrustedActiveListTotal({
        activeCard: 'ready_for_registration',
        serverApplicationStatus: 'ready_for_registration',
        paginationTotal: 99,
        listSettled: false,
        view: 'table',
      }),
    ).toBeNull();
    expect(
      resolveTrustedActiveListTotal({
        activeCard: 'ready_for_registration',
        serverApplicationStatus: 'accepted',
        paginationTotal: 9,
        listSettled: true,
        view: 'table',
      }),
    ).toBeNull();
    expect(
      resolveTrustedActiveListTotal({
        activeCard: 'ready_for_registration',
        serverApplicationStatus: 'ready_for_registration',
        paginationTotal: 3,
        listSettled: true,
        view: 'kanban',
      }),
    ).toBeNull();
  });
});
