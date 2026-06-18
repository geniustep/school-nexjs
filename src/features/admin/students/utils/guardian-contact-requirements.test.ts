import { describe, expect, it } from 'vitest';
import {
  buildContactPatchPayload,
  isGuardianContactPhoneRequiredError,
  isGuardianLinkActionDisabled,
  responsibilitiesRequiringPhone,
  shouldShowContactRequiredSection,
} from './guardian-contact-requirements';
import { DEFAULT_RELATIONSHIP_FORM } from '../components/guardian-relationship-form';
import type { PersonSearchResult } from '@/types/student-360';

const personMissingPhone: Pick<PersonSearchResult, 'missing_contact_fields' | 'phone' | 'email'> = {
  partner_id: 1,
  missing_contact_fields: ['phone'],
  phone: null,
  email: 'test@example.com',
} as PersonSearchResult;

describe('guardian-contact-requirements', () => {
  it('disables final action when existing person missing phone and emergency selected', () => {
    const values = { ...DEFAULT_RELATIONSHIP_FORM, is_emergency_contact: true };
    expect(responsibilitiesRequiringPhone(values)).toBe(true);
    expect(
      isGuardianLinkActionDisabled(values, {
        canLink: true,
        person: personMissingPhone,
        patch: { phone: '', email: '' },
        touched: { phone: false, email: false },
        isNewPerson: false,
        newPersonPhoneValid: false,
      }),
    ).toBe(true);
  });

  it('includes phone in contact_patch payload when completed', () => {
    const payload = buildContactPatchPayload(
      { phone: '0612345678', email: '' },
      { phone: true, email: false },
    );
    expect(payload).toEqual({ phone: '0612345678' });
  });

  it('shows contact required section when responsibilities need phone', () => {
    const values = { ...DEFAULT_RELATIONSHIP_FORM, receives_notifications: true };
    expect(
      shouldShowContactRequiredSection(
        values,
        personMissingPhone,
        { phone: '', email: '' },
        { phone: false, email: false },
      ),
    ).toBe(true);
  });

  it('recognizes guardian_contact_phone_required error code', () => {
    expect(isGuardianContactPhoneRequiredError('guardian_contact_phone_required')).toBe(true);
    expect(isGuardianContactPhoneRequiredError('validation_error')).toBe(false);
  });

  it('allows link when phone patch is valid', () => {
    const values = { ...DEFAULT_RELATIONSHIP_FORM, is_emergency_contact: true };
    expect(
      isGuardianLinkActionDisabled(values, {
        canLink: true,
        person: personMissingPhone,
        patch: { phone: '0612345678', email: '' },
        touched: { phone: true, email: false },
        isNewPerson: false,
        newPersonPhoneValid: false,
      }),
    ).toBe(false);
  });
});
