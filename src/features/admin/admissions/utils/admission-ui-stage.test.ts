import { describe, expect, it } from 'vitest';
import {
  itemMatchesUiStageFilter,
  rawStatesForUiStageFetch,
  resolveAdmissionUiStage,
} from '@/features/admin/admissions/utils/admission-ui-stage';
import type { AdmissionListItem } from '@/types/admission';

function makeItem(
  overrides: Partial<AdmissionListItem> & Pick<AdmissionListItem, 'id'>,
): AdmissionListItem {
  return {
    student_name: 'Test',
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

describe('resolveAdmissionUiStage', () => {
  it('maps raw states to UI stages', () => {
    expect(resolveAdmissionUiStage(makeItem({ id: 1, state: 'new' }))).toBe('new');
    expect(resolveAdmissionUiStage(makeItem({ id: 2, state: 'contacted' }))).toBe('in_follow_up');
    expect(resolveAdmissionUiStage(makeItem({ id: 3, state: 'under_review' }))).toBe('in_evaluation');
    expect(resolveAdmissionUiStage(makeItem({ id: 4, state: 'offer_sent' }))).toBe('accepted');
    expect(resolveAdmissionUiStage(makeItem({ id: 5, state: 'confirmed' }))).toBe('ready_for_registration');
    expect(resolveAdmissionUiStage(makeItem({ id: 6, state: 'lost' }))).toBe('closed');
  });

  it('registered overrides raw state when linked to a student', () => {
    expect(
      resolveAdmissionUiStage(makeItem({ id: 7, state: 'confirmed', student_id: 42 })),
    ).toBe('registered');
    expect(
      resolveAdmissionUiStage(
        makeItem({ id: 8, state: 'accepted', registration_flow_state: 'linked' }),
      ),
    ).toBe('registered');
  });

  it('confirmed without linkage stays ready_for_registration', () => {
    expect(resolveAdmissionUiStage(makeItem({ id: 9, state: 'confirmed' }))).toBe(
      'ready_for_registration',
    );
  });
});

describe('rawStatesForUiStageFetch', () => {
  it('returns multiple raw states for grouped stages', () => {
    expect(rawStatesForUiStageFetch('in_follow_up')).toEqual([
      'contacted',
      'qualified',
      'visit_pending',
    ]);
  });

  it('returns empty for registered so callers fetch all active states', () => {
    expect(rawStatesForUiStageFetch('registered')).toEqual([]);
  });
});

describe('itemMatchesUiStageFilter', () => {
  it('matches by resolved UI stage', () => {
    const item = makeItem({ id: 10, state: 'qualified' });
    expect(itemMatchesUiStageFilter(item, 'in_follow_up')).toBe(true);
    expect(itemMatchesUiStageFilter(item, 'new')).toBe(false);
  });
});
