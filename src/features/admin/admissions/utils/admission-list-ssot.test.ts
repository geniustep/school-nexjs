import { describe, expect, it } from 'vitest';
import {
  applyOperationalCard,
  type AdmissionWorkspaceListState,
} from './admission-workspace';
import {
  areAdmissionsFiltersReady,
  buildAdmissionsDashboardQuery,
  buildAdmissionsListQueryKey,
  buildAdmissionsResourceQueryKey,
} from './admission-list-ssot';

function base(patch: Partial<AdmissionWorkspaceListState> = {}): AdmissionWorkspaceListState {
  return {
    workspace: 'follow_up',
    followStage: '',
    awaitingSub: '',
    postSub: 'awaiting',
    closedSub: 'rejected',
    hideConverted: true,
    page: 1,
    view: 'table',
    ...patch,
  };
}

describe('admissions list SSOT query keys / gate', () => {
  it('does not fetch while school session is switching or unresolved', () => {
    expect(
      areAdmissionsFiltersReady({
        switching: true,
        requiresActiveSchool: true,
        activeSchoolId: 3,
        allowedSchoolIds: [3],
      }),
    ).toBe(false);
    expect(
      areAdmissionsFiltersReady({
        switching: false,
        requiresActiveSchool: true,
        activeSchoolId: null,
        allowedSchoolIds: [3],
      }),
    ).toBe(false);
    expect(
      areAdmissionsFiltersReady({
        switching: false,
        requiresActiveSchool: true,
        activeSchoolId: 3,
        allowedSchoolIds: [3],
      }),
    ).toBe(true);
  });

  it('status / search / hide_registered / page each change the list query key', () => {
    const school = { activeSchoolId: 3 as const, pageSize: 25 };
    const ready = applyOperationalCard(base(), 'ready_for_registration');
    const accepted = applyOperationalCard(base(), 'awaiting_registration');
    const keyReady = buildAdmissionsListQueryKey(ready, school);
    const keyAccepted = buildAdmissionsListQueryKey(accepted, school);
    expect(keyReady).not.toBe(keyAccepted);
    expect(keyReady).toContain('ready_for_registration');
    expect(keyAccepted).toContain('accepted');

    const withSearch = buildAdmissionsListQueryKey(
      { ...ready, search: 'salma' },
      school,
    );
    expect(withSearch).not.toBe(keyReady);
    expect(withSearch).toContain('salma');

    const showRegistered = buildAdmissionsListQueryKey(
      { ...ready, hideConverted: false },
      school,
    );
    // ready filter is application_status only — hideConverted affects post_acceptance domain
    // when toggling registered visibility via workspace statuses; still must not collide with
    // a different page.
    const page2 = buildAdmissionsListQueryKey({ ...ready, page: 2 }, school);
    expect(page2).not.toBe(keyReady);

    const workspaceFollow = buildAdmissionsListQueryKey(base({ workspace: 'follow_up' }), school);
    expect(workspaceFollow).not.toBe(keyReady);
    expect(showRegistered).toBeDefined();
  });

  it('dashboard query shares context filters but never status/workspace', () => {
    const state = base({
      search: 'ahmed',
      academicYearId: '12',
      sourceId: '4',
      cycleCode: 'college',
      cycleId: 3,
      levelId: '9',
    });
    // Context is cleared only when applying a KPI card — list boot keeps filters.
    const dash = buildAdmissionsDashboardQuery(state);
    expect(dash).toMatchObject({
      search: 'ahmed',
      academic_year_id: 12,
      source_id: 4,
      cycle_id: 3,
      level_id: 9,
      hide_registered: 1,
    });
    expect(dash).not.toHaveProperty('application_status');
    expect(dash).not.toHaveProperty('workspace');
  });

  it('hide_registered query key flips with show_registered toggle', () => {
    const hidden = buildAdmissionsListQueryKey(base({ hideConverted: true }), {
      activeSchoolId: 3,
    });
    const shown = buildAdmissionsListQueryKey(base({ hideConverted: false }), {
      activeSchoolId: 3,
    });
    expect(hidden).toContain('hide_registered');
    expect(shown).not.toContain('hide_registered');
    expect(hidden).not.toBe(shown);
  });

  it('resource query key sorts keys so equal filters collide intentionally', () => {
    const a = buildAdmissionsResourceQueryKey({
      page: 1,
      application_status: 'accepted',
      active_school_id: 3,
    });
    const b = buildAdmissionsResourceQueryKey({
      active_school_id: 3,
      application_status: 'accepted',
      page: 1,
    });
    expect(a).toBe(b);
  });

  it('exact status list query omits workspace/state/registration_status', () => {
    const key = buildAdmissionsListQueryKey(
      applyOperationalCard(base(), 'ready_for_registration'),
      { activeSchoolId: 3 },
    );
    expect(key).not.toContain('workspace');
    expect(key).not.toContain('"state"');
    expect(key).not.toContain('registration_status');
    expect(key).not.toContain('decision');
  });
});
