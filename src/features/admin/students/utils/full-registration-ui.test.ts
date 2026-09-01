import { describe, expect, it } from 'vitest';
import {
  FULL_REGISTRATION_DEFAULT_GENDER,
  FULL_REGISTRATION_GUARDIAN_SEARCH_DEBOUNCE_MS,
  alignAcademicYearsWithActiveContext,
  fullRegistrationErrorMessageKey,
  fullRegistrationGenderLabel,
} from './full-registration-ui';

describe('full registration UI defaults', () => {
  it('defaults gender to male and localizes canonical gender labels', () => {
    expect(FULL_REGISTRATION_DEFAULT_GENDER).toBe('male');
    expect(fullRegistrationGenderLabel('ar', 'male', 'male')).toBe('ذكر');
    expect(fullRegistrationGenderLabel('ar', 'female', 'female')).toBe('أنثى');
    expect(fullRegistrationGenderLabel('fr', 'male', 'male')).toBe('Masculin');
  });

  it('uses the active academic year context as the current year in registration options', () => {
    const years = alignAcademicYearsWithActiveContext(
      [
        { id: 1, name: '2025-2026', is_current: true },
        { id: 2, name: '2026-2027', is_current: false },
      ],
      2,
    );
    expect(years.find((year) => year.is_current)?.id).toBe(2);
  });

  it('maps the observed billing ambiguity error and keeps guardian search responsive', () => {
    expect(fullRegistrationErrorMessageKey('billing_partner_ambiguous')).toBe('billingAmbiguous');
    expect(FULL_REGISTRATION_GUARDIAN_SEARCH_DEBOUNCE_MS).toBeLessThanOrEqual(150);
  });
});
