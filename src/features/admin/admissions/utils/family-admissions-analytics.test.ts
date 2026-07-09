import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildFamilyAdmissionAnalyticsProperties,
  createFamilyAdmissionWizardAnalyticsGuards,
  FAMILY_ADMISSION_ANALYTICS_EVENTS,
  FAMILY_ADMISSION_FORBIDDEN_PROPERTY_KEYS,
  mapFamilyAdmissionSubmitResult,
  resetFamilyAdmissionWizardAnalyticsGuards,
  toChildrenCountBucket,
  toFamilySizeBucket,
  trackFamilyAdmissionStarted,
  trackFamilyAdmissionStepCompleted,
  trackFamilyAdmissionSubmitResult,
  trackFamilyPanelOpened,
  trackFamilySiblingLinkClicked,
} from './family-admissions-analytics';

vi.mock('@vercel/analytics', () => ({
  track: vi.fn(),
}));

import { track } from '@vercel/analytics';

const mockedTrack = vi.mocked(track);

beforeEach(() => {
  mockedTrack.mockClear();
  vi.stubGlobal('window', {} as Window & typeof globalThis);
  vi.stubEnv('VITEST', '');
  vi.stubEnv('NODE_ENV', 'development');
});

describe('family-admissions-analytics', () => {
  it('uses stable event names', () => {
    expect(FAMILY_ADMISSION_ANALYTICS_EVENTS).toEqual({
      STARTED: 'family_admission_started',
      STEP_COMPLETED: 'family_admission_step_completed',
      SUBMIT_RESULT: 'family_admission_submit_result',
      PANEL_OPENED: 'family_panel_opened',
      SIBLING_LINK_CLICKED: 'family_sibling_link_clicked',
    });
  });

  it('buckets children counts', () => {
    expect(toChildrenCountBucket(2)).toBe('2');
    expect(toChildrenCountBucket(3)).toBe('3');
    expect(toChildrenCountBucket(4)).toBe('4_plus');
    expect(toChildrenCountBucket(6)).toBe('4_plus');
    expect(toFamilySizeBucket(2)).toBe('2');
  });

  it('maps submit results without attaching raw backend errors', () => {
    expect(mapFamilyAdmissionSubmitResult('validation_error')).toBe('validation_error');
    expect(
      mapFamilyAdmissionSubmitResult({
        kind: 'success',
        replay: false,
        data: {
          batch_id: 99,
          family_reference: 'FAM-SECRET',
          application_count: 2,
          applications: [],
        },
      }),
    ).toBe('success');
    expect(mapFamilyAdmissionSubmitResult({ kind: 'idempotency_conflict' })).toBe('conflict');
    expect(
      mapFamilyAdmissionSubmitResult({
        kind: 'error',
        code: 'network_error',
        message: 'Sensitive backend detail',
      }),
    ).toBe('network_error');
    expect(
      mapFamilyAdmissionSubmitResult({
        kind: 'error',
        code: 'guardian_snapshot_conflict',
        message: 'Sensitive backend detail',
      }),
    ).toBe('server_error');
  });

  it('allows only whitelisted properties', () => {
    expect(
      buildFamilyAdmissionAnalyticsProperties({
        step: 'family',
        children_count_bucket: '2',
        family_batch_id: 12,
        guardian_name: 'secret',
        error_message: 'raw error',
      }),
    ).toEqual({
      step: 'family',
      children_count_bucket: '2',
    });
  });

  it('documents forbidden property keys', () => {
    expect(FAMILY_ADMISSION_FORBIDDEN_PROPERTY_KEYS).toContain('family_batch_id');
    expect(FAMILY_ADMISSION_FORBIDDEN_PROPERTY_KEYS).toContain('guardian_name');
    expect(FAMILY_ADMISSION_FORBIDDEN_PROPERTY_KEYS).toContain('error_message');
  });

  it('guards started once within the same wizard session', () => {
    const guards = createFamilyAdmissionWizardAnalyticsGuards();
    trackFamilyAdmissionStarted(guards);
    trackFamilyAdmissionStarted(guards);

    expect(mockedTrack).toHaveBeenCalledTimes(1);
    expect(mockedTrack).toHaveBeenCalledWith('family_admission_started', undefined);
  });

  it('allows started again for a new wizard session', () => {
    const first = createFamilyAdmissionWizardAnalyticsGuards();
    trackFamilyAdmissionStarted(first);

    const second = createFamilyAdmissionWizardAnalyticsGuards();
    trackFamilyAdmissionStarted(second);

    expect(mockedTrack).toHaveBeenCalledTimes(2);
  });

  it('guards step completion once per step within a session', () => {
    const guards = createFamilyAdmissionWizardAnalyticsGuards();
    trackFamilyAdmissionStepCompleted(guards, 'family', 2);
    trackFamilyAdmissionStepCompleted(guards, 'family', 2);

    expect(mockedTrack).toHaveBeenCalledTimes(1);
    expect(mockedTrack).toHaveBeenCalledWith('family_admission_step_completed', {
      step: 'family',
      children_count_bucket: '2',
    });
  });

  it('does not inherit completed steps across wizard sessions', () => {
    const first = createFamilyAdmissionWizardAnalyticsGuards();
    trackFamilyAdmissionStepCompleted(first, 'family', 2);
    trackFamilyAdmissionStepCompleted(first, 'children', 2);

    const second = createFamilyAdmissionWizardAnalyticsGuards();
    trackFamilyAdmissionStepCompleted(second, 'family', 2);

    expect(mockedTrack).toHaveBeenCalledTimes(3);
    expect(mockedTrack).toHaveBeenLastCalledWith('family_admission_step_completed', {
      step: 'family',
      children_count_bucket: '2',
    });
  });

  it('resets wizard guards for create-another within the same mount', () => {
    const guards = createFamilyAdmissionWizardAnalyticsGuards();
    trackFamilyAdmissionStarted(guards);
    trackFamilyAdmissionStepCompleted(guards, 'family', 2);

    resetFamilyAdmissionWizardAnalyticsGuards(guards);
    trackFamilyAdmissionStarted(guards);
    trackFamilyAdmissionStepCompleted(guards, 'family', 2);

    expect(mockedTrack).toHaveBeenCalledTimes(4);
  });

  it('records submit result with bucket only', () => {
    trackFamilyAdmissionSubmitResult('server_error', 3);

    expect(mockedTrack).toHaveBeenCalledWith('family_admission_submit_result', {
      result: 'server_error',
      children_count_bucket: '3',
    });
  });

  it('emits panel opened without mount-global session keys', () => {
    trackFamilyPanelOpened(2);
    trackFamilyPanelOpened(2);

    expect(mockedTrack).toHaveBeenCalledTimes(2);
    expect(mockedTrack).toHaveBeenCalledWith('family_panel_opened', {
      family_size_bucket: '2',
    });
  });

  it('allows panel open again for a new mount when caller uses a fresh local guard', () => {
    let openedSent = false;
    const openOnce = () => {
      if (openedSent) return;
      openedSent = true;
      trackFamilyPanelOpened(2);
    };

    openOnce();
    openOnce();
    expect(mockedTrack).toHaveBeenCalledTimes(1);

    openedSent = false;
    openOnce();
    expect(mockedTrack).toHaveBeenCalledTimes(2);
  });

  it('tracks sibling navigation without ids', () => {
    trackFamilySiblingLinkClicked();

    expect(mockedTrack).toHaveBeenCalledWith('family_sibling_link_clicked', undefined);
  });

  it('does not emit events during unit tests', () => {
    vi.unstubAllGlobals();
    vi.stubEnv('VITEST', 'true');
    vi.stubEnv('NODE_ENV', 'test');

    const guards = createFamilyAdmissionWizardAnalyticsGuards();
    trackFamilyAdmissionStarted(guards);
    trackFamilyAdmissionStepCompleted(guards, 'children', 2);
    trackFamilyAdmissionSubmitResult('success', 2);
    trackFamilyPanelOpened(2);
    trackFamilySiblingLinkClicked();

    expect(mockedTrack).not.toHaveBeenCalled();
  });
});
