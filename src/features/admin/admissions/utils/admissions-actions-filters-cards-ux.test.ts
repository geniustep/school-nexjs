import { describe, expect, it } from 'vitest';
import {
  buildAdmissionOutcomeFilterQuery,
  outcomeFilterNeedsClosed,
  resolveAdmissionPrimaryDisplay,
  resolveRegistrationDisplayLabelKey,
  MAIN_DASHBOARD_CARD_FILTERS,
} from './admission-status-display';
import {
  filterClosedAdmissionListItems,
  filterAdmissionListItems,
  hasActiveAdmissionListFilters,
  shouldIncludeClosedAdmissions,
  countHiddenConvertedAdmissionListItems,
} from './filter-admission-list-items';
import { resolveKanbanDisplayStages } from './admission-ui-stage';
import type { AdmissionListItem } from '@/types/admission';

function makeItem(overrides: Partial<AdmissionListItem> = {}): AdmissionListItem {
  return {
    id: 1,
    student_name: 'Child',
    guardian_name: null,
    guardian_phone: null,
    source: null,
    requested_level: null,
    state: 'new',
    next_action: null,
    next_action_date: null,
    duplicate_count: 0,
    offer_state: null,
    assigned_user: null,
    priority: null,
    ...overrides,
  };
}

describe('NEXTJS-ADMISSIONS-ACTIONS-FILTERS-CARDS-UX-2 contracts', () => {
  it('main dashboard cards are exactly three interactive outcomes (plus active info)', () => {
    expect(MAIN_DASHBOARD_CARD_FILTERS).toEqual([
      'awaiting_registration',
      'ready_for_registration',
      'school_rejected',
    ]);
    expect(MAIN_DASHBOARD_CARD_FILTERS).not.toContain('registered');
  });

  it('ready card query uses state=confirmed and confirmed_count source key', () => {
    const query = buildAdmissionOutcomeFilterQuery('ready_for_registration');
    expect(query).toEqual({ state: 'confirmed' });
    expect(query).not.toEqual({ registration_status: 'registered' });
    expect(query).not.toHaveProperty('registration_status');
  });

  it('awaiting card uses awaiting_registration_count query', () => {
    expect(buildAdmissionOutcomeFilterQuery('awaiting_registration')).toEqual({
      registration_status: 'awaiting_registration',
    });
  });

  it('rejected card uses decision=rejected', () => {
    expect(buildAdmissionOutcomeFilterQuery('school_rejected')).toEqual({
      decision: 'rejected',
    });
  });

  it('registered filter stays available as registration_status=registered', () => {
    expect(buildAdmissionOutcomeFilterQuery('registered')).toEqual({
      registration_status: 'registered',
    });
  });

  it('ready does not apply registration_status=registered', () => {
    const q = buildAdmissionOutcomeFilterQuery('ready_for_registration');
    expect(q.registration_status).toBeUndefined();
    expect(q.state).toBe('confirmed');
  });

  it('rejected needs closed applications included', () => {
    expect(outcomeFilterNeedsClosed('school_rejected')).toBe(true);
    expect(outcomeFilterNeedsClosed('family_declined')).toBe(true);
    expect(outcomeFilterNeedsClosed('expired_offer')).toBe(true);
    expect(outcomeFilterNeedsClosed('awaiting_registration')).toBe(false);
    expect(
      shouldIncludeClosedAdmissions({ outcomeFilter: 'school_rejected', stateFilter: '' }),
    ).toBe(true);
  });

  it('hideRegistered helper hides only application_status=registered', () => {
    const items = [
      makeItem({ id: 1, application_status: 'new' }),
      makeItem({ id: 2, application_status: 'registered', student_id: 99 }),
    ];
    expect(filterAdmissionListItems(items, true)).toHaveLength(1);
    expect(countHiddenConvertedAdmissionListItems(items, true)).toBe(1);
  });

  it('default list excludes closed unless rejected filter is active', () => {
    const items = [
      makeItem({ id: 1, state: 'new' }),
      makeItem({ id: 2, state: 'lost', decision: 'rejected', is_school_rejected: true }),
    ];
    expect(filterClosedAdmissionListItems(items, false)).toHaveLength(1);
    expect(filterClosedAdmissionListItems(items, true)).toHaveLength(2);
  });

  it('confirmed shows ready_for_registration in detail label', () => {
    expect(
      resolveRegistrationDisplayLabelKey(
        makeItem({ state: 'confirmed', registration_status: 'awaiting_registration' }),
      ),
    ).toContain('ready_for_registration');
    expect(
      resolveAdmissionPrimaryDisplay(
        makeItem({ state: 'confirmed', registration_status: 'awaiting_registration' }),
      ).kind,
    ).toBe('ready_for_registration');
  });

  it('registered has priority when student_id is present', () => {
    expect(
      resolveAdmissionPrimaryDisplay(
        makeItem({
          state: 'confirmed',
          student_id: 55,
          registration_status: 'registered',
        }),
      ).kind,
    ).toBe('registered');
  });

  it('state=lost alone is not school rejection', () => {
    const primary = resolveAdmissionPrimaryDisplay(
      makeItem({ state: 'lost', decision: false, is_school_rejected: false }),
    );
    expect(primary.kind).not.toBe('school_rejected');
  });

  it('active filters track show-registered but not showClosed chip alone', () => {
    expect(
      hasActiveAdmissionListFilters({
        search: '',
        stateFilter: '',
        outcomeFilter: '',
        offerStateFilter: '',
      }),
    ).toBe(false);
    expect(
      hasActiveAdmissionListFilters({
        search: '',
        stateFilter: 'in_evaluation',
        outcomeFilter: 'school_rejected',
      }),
    ).toBe(true);
    expect(hasActiveAdmissionListFilters({ hideConverted: false })).toBe(true);
  });

  it('kanban always shows registered column; closed only when needed', () => {
    const open = resolveKanbanDisplayStages({ includeClosed: false });
    expect(open).toContain('registered');
    expect(open).not.toContain('closed');
    expect(resolveKanbanDisplayStages({ includeClosed: true })).toContain('closed');
  });
});

describe('filter conflict helpers', () => {
  it('documents mutual exclusivity: stage vs outcome must not both drive query', () => {
    // Selecting outcome clears stage in UI; selecting stage clears outcome.
    // Query builders remain single-dimension for the primary quick filter.
    const rejected = buildAdmissionOutcomeFilterQuery('school_rejected');
    const ready = buildAdmissionOutcomeFilterQuery('ready_for_registration');
    expect(rejected).not.toHaveProperty('state');
    expect(ready).not.toHaveProperty('decision');
    expect(ready).not.toHaveProperty('registration_status');
  });
});
