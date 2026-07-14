/**
 * Single-source-of-truth loading / count contracts for Admissions list KPI.
 */
import { describe, expect, it } from 'vitest';
import {
  ADMISSIONS_OPERATIONAL_CARDS,
  dashboardHasModernStatusCounts,
  resolveOperationalCardCount,
  resolveOperationalCardDisplayCount,
  resolveTrustedActiveListTotal,
} from './admissions-dashboard-cards';
import type { AdmissionsDashboard } from '@/types/admission';

const dash: AdmissionsDashboard = {
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
    accepted: 9,
    ready_for_registration: 3,
    rejected: 0,
  },
  application_status_accepted_count: 9,
  application_status_ready_for_registration_count: 3,
  application_status_rejected_count: 0,
};

describe('admissions SSOT loading / counts', () => {
  it('detects modern status surface', () => {
    expect(dashboardHasModernStatusCounts(dash)).toBe(true);
    expect(
      dashboardHasModernStatusCounts({
        ...dash,
        application_status_counts: undefined,
        application_status_accepted_count: undefined,
        application_status_ready_for_registration_count: undefined,
        application_status_rejected_count: undefined,
        ready_for_registration_count: undefined,
      }),
    ).toBe(false);
  });

  it('KPI stays on dashboard while list is in flight (no stale pagination overlay)', () => {
    const awaiting = ADMISSIONS_OPERATIONAL_CARDS[0];
    const staleTotal = resolveTrustedActiveListTotal({
      activeCard: 'awaiting_registration',
      // Still the previous ready filter's total in memory
      serverApplicationStatus: 'ready_for_registration',
      paginationTotal: 3,
      listSettled: false,
      view: 'table',
    });
    expect(staleTotal).toBeNull();
    expect(
      resolveOperationalCardDisplayCount(dash, awaiting, {
        activeCard: 'awaiting_registration',
        activeListTotal: staleTotal,
      }),
    ).toBe(9);
  });

  it('after settle, badge matches pagination.total for same status', () => {
    const ready = ADMISSIONS_OPERATIONAL_CARDS[1];
    const total = resolveTrustedActiveListTotal({
      activeCard: 'ready_for_registration',
      serverApplicationStatus: 'ready_for_registration',
      paginationTotal: 3,
      listSettled: true,
      view: 'table',
    });
    expect(total).toBe(3);
    expect(
      resolveOperationalCardDisplayCount(dash, ready, {
        activeCard: 'ready_for_registration',
        activeListTotal: total,
      }),
    ).toBe(3);
  });

  it('operational counts equal application_status map, not legacy awaiting/confirmed', () => {
    expect(resolveOperationalCardCount(dash, ADMISSIONS_OPERATIONAL_CARDS[0])).toBe(9);
    expect(resolveOperationalCardCount(dash, ADMISSIONS_OPERATIONAL_CARDS[1])).toBe(3);
    expect(resolveOperationalCardCount(dash, ADMISSIONS_OPERATIONAL_CARDS[0])).not.toBe(
      dash.awaiting_registration_count,
    );
    expect(resolveOperationalCardCount(dash, ADMISSIONS_OPERATIONAL_CARDS[1])).not.toBe(
      dash.confirmed_count,
    );
  });
});
