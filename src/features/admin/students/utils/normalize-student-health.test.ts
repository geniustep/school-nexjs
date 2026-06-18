import { describe, expect, it } from 'vitest';
import {
  formatHealthTriStateValue,
  hasCriticalHealthAlert,
  isLegacyNegativeHealthText,
  legacyHealthTextToTriState,
  normalizeStudentHealthProfile,
  normalizeStudentHealthSummary,
  resolveHealthAlertPresentation,
} from './normalize-student-health';
import {
  buildStudentHealthCreatePayload,
  buildStudentHealthPartialUpdatePayload,
  defaultStudentHealthFormState,
  validateStudentHealthForm,
} from './student-health-profile';

describe('normalizeStudentHealthProfile', () => {
  it('maps new contract with no critical alert when flags are false', () => {
    const profile = normalizeStudentHealthProfile({
      has_allergies: false,
      allergies_description: null,
      has_chronic_conditions: false,
      chronic_conditions_description: null,
      blood_type: 'O+',
      health_alert_level: 'none',
      has_critical_health_alert: false,
      critical_health_items: [],
    });

    expect(profile?.has_allergies).toBe(false);
    expect(profile?.has_chronic_conditions).toBe(false);
    expect(profile?.health_alert_level).toBe('none');
    expect(hasCriticalHealthAlert(profile)).toBe(false);
    expect(resolveHealthAlertPresentation(profile).showCritical).toBe(false);
    expect(resolveHealthAlertPresentation(profile).showCalm).toBe(true);
  });

  it('does not treat blood type only as critical', () => {
    const profile = normalizeStudentHealthProfile({
      blood_type: 'O+',
      health_alert_level: 'none',
      has_critical_health_alert: false,
    });
    expect(hasCriticalHealthAlert(profile)).toBe(false);
    expect(resolveHealthAlertPresentation(profile).showCritical).toBe(false);
  });

  it('shows critical alert when has_allergies is true with description', () => {
    const profile = normalizeStudentHealthProfile({
      has_allergies: true,
      allergies_description: 'Pollen',
      health_alert_level: 'critical',
      has_critical_health_alert: true,
      critical_health_items: [{ key: 'allergies', label: 'Allergies', description: 'Pollen' }],
    });

    expect(resolveHealthAlertPresentation(profile).showCritical).toBe(true);
    expect(resolveHealthAlertPresentation(profile).criticalItems).toHaveLength(1);
  });

  it('shows warning banner for incomplete profile', () => {
    const profile = normalizeStudentHealthProfile({
      blood_type: 'A+',
      health_alert_level: 'warning',
      has_critical_health_alert: false,
    });
    const presentation = resolveHealthAlertPresentation(profile);
    expect(presentation.showCritical).toBe(false);
    expect(presentation.showWarning).toBe(true);
  });

  it('legacy allergies="لا" maps to false', () => {
    const profile = normalizeStudentHealthProfile({
      allergies: 'لا',
      chronic_conditions: 'لا',
      blood_type: 'O+',
    });
    expect(profile?.has_allergies).toBe(false);
    expect(profile?.has_chronic_conditions).toBe(false);
    expect(hasCriticalHealthAlert(profile)).toBe(false);
  });

  it('legacy allergies="Pollen" maps to true with description', () => {
    const profile = normalizeStudentHealthProfile({
      allergies: 'Pollen',
      blood_type: 'O+',
    });
    expect(profile?.has_allergies).toBe(true);
    expect(profile?.allergies_description).toBe('Pollen');
  });
});

describe('legacy health text helpers', () => {
  it('treats negative literals as false', () => {
    expect(isLegacyNegativeHealthText('لا')).toBe(true);
    expect(isLegacyNegativeHealthText('no')).toBe(true);
    expect(legacyHealthTextToTriState('لا')).toEqual({ has: false, description: null });
  });

  it('treats medical text as true', () => {
    expect(legacyHealthTextToTriState('Pollen')).toEqual({ has: true, description: 'Pollen' });
  });
});

describe('student health form', () => {
  const t = (key: string) => key;

  it('rejects yes without description locally', () => {
    const state = { ...defaultStudentHealthFormState(), hasAllergies: true, allergiesDescription: '' };
    const result = validateStudentHealthForm(state, ['O+'], t);
    expect(result.valid).toBe(false);
    expect(result.errors.allergiesDescription).toBe('admin.student360.health.errors.allergiesDescriptionRequired');
  });

  it('builds create payload with new fields', () => {
    const state = {
      ...defaultStudentHealthFormState(),
      hasAllergies: true,
      allergiesDescription: 'فول سوداني',
      hasChronicConditions: false,
    };
    const payload = buildStudentHealthCreatePayload(state);
    expect(payload.has_allergies).toBe(true);
    expect(payload.allergies_description).toBe('فول سوداني');
    expect(payload.has_chronic_conditions).toBe(false);
    expect(payload.chronic_conditions_description).toBeNull();
  });

  it('builds partial update for changed tri-state only', () => {
    const original = { ...defaultStudentHealthFormState(), hasAllergies: false };
    const current = { ...original, hasAllergies: true, allergiesDescription: 'Pollen' };
    const payload = buildStudentHealthPartialUpdatePayload(current, original);
    expect(payload.has_allergies).toBe(true);
    expect(payload.allergies_description).toBe('Pollen');
    expect(payload.blood_type).toBeUndefined();
  });
});

describe('formatHealthTriStateValue', () => {
  const t = (key: string) =>
    ({
      'common.yes': 'نعم',
      'common.no': 'لا',
      'admin.student360.health.unspecified': 'غير محدد',
    })[key] ?? key;

  it('formats false as no', () => {
    expect(formatHealthTriStateValue(false, null, t)).toBe('لا');
  });
});

describe('normalizeStudentHealthSummary', () => {
  it('clears stale legacy critical flag when allergies and chronic are "لا"', () => {
    const summary = normalizeStudentHealthSummary({
      has_profile: true,
      has_critical_alert: true,
      allergies: 'لا',
      chronic_conditions: 'لا',
      health_alert_level: 'none',
    });

    expect(summary?.has_profile).toBe(true);
    expect(summary?.has_critical_health_alert).toBe(false);
    expect(summary?.health_alert_level).toBe('none');
  });

  it('keeps critical when health_alert_level is critical', () => {
    const summary = normalizeStudentHealthSummary({
      has_profile: true,
      health_alert_level: 'critical',
      has_critical_health_alert: true,
    });

    expect(summary?.has_critical_health_alert).toBe(true);
    expect(summary?.health_alert_level).toBe('critical');
  });

  it('does not treat blood type only as critical', () => {
    const summary = normalizeStudentHealthSummary({
      has_profile: true,
      blood_type: 'O+',
      has_critical_alert: true,
      health_alert_level: 'none',
    });

    expect(summary?.has_critical_health_alert).toBe(false);
  });
});
