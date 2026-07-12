import { describe, expect, it } from 'vitest';
import {
  ADMISSIONS_MAIN_DASHBOARD_CARDS,
  resolveDashboardOutcomeClick,
  shouldShowOfferIndicator,
} from './admissions-dashboard-cards';
import { buildAdmissionOutcomeFilterQuery } from './admission-status-display';

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

  it('third card is ready_for_registration using confirmed_count', () => {
    const third = ADMISSIONS_MAIN_DASHBOARD_CARDS[2];
    expect(third.id).toBe('ready_for_registration');
    expect(third.countKey).toBe('confirmed_count');
    expect(third.interactive).toBe(true);
    expect(buildAdmissionOutcomeFilterQuery(third.filter!)).toEqual({ state: 'confirmed' });
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

  it('awaiting and rejected use correct count keys', () => {
    expect(ADMISSIONS_MAIN_DASHBOARD_CARDS[1].countKey).toBe('awaiting_registration_count');
    expect(ADMISSIONS_MAIN_DASHBOARD_CARDS[3].countKey).toBe('school_rejected_count');
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
});
