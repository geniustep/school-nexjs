import type { GuardianContactPatch, PersonSearchResult } from '@/types/student-360';
import { getGuardianEmailPresentation } from './guardian-email-presentation';
import { moroccanPhoneSearchQuery, validateMoroccanPhone } from './normalize-moroccan-phone';
import type { RelationshipFormValues } from '../components/guardian-relationship-form';

export interface ContactPatchDraft {
  phone: string;
  email: string;
}

export interface ContactPatchTouched {
  phone: boolean;
  email: boolean;
}

export const EMPTY_CONTACT_PATCH_DRAFT: ContactPatchDraft = { phone: '', email: '' };
export const EMPTY_CONTACT_PATCH_TOUCHED: ContactPatchTouched = { phone: false, email: false };

export function responsibilitiesRequiringPhone(values: RelationshipFormValues): boolean {
  return (
    values.receives_notifications ||
    values.is_emergency_contact ||
    values.is_authorized_pickup ||
    values.is_financial_responsible
  );
}

export function personHasValidPhone(phone?: string | null): boolean {
  return validateMoroccanPhone(phone ?? '');
}

export function personHasValidEmail(email?: string | null): boolean {
  return getGuardianEmailPresentation(email).kind === 'usable';
}

export function resolveEffectivePhone(
  personPhone?: string | null,
  patch?: ContactPatchDraft,
  touched?: ContactPatchTouched,
): string {
  if (touched?.phone && patch?.phone.trim()) return patch.phone.trim();
  return personPhone?.trim() ?? '';
}

export function resolveEffectiveEmail(
  personEmail?: string | null,
  patch?: ContactPatchDraft,
  touched?: ContactPatchTouched,
): string {
  if (touched?.email && patch?.email.trim()) return patch.email.trim();
  return personEmail?.trim() ?? '';
}

export function personMissingContactField(
  person: Pick<PersonSearchResult, 'missing_contact_fields' | 'phone' | 'email'>,
  field: 'phone' | 'email',
): boolean {
  if (person.missing_contact_fields?.includes(field)) return true;
  if (field === 'phone') return !personHasValidPhone(person.phone);
  return !personHasValidEmail(person.email);
}

export function shouldShowContactRequiredSection(
  values: RelationshipFormValues,
  person: Pick<PersonSearchResult, 'missing_contact_fields' | 'phone' | 'email'> | null,
  patch: ContactPatchDraft,
  touched: ContactPatchTouched,
  forceOpen = false,
): boolean {
  if (forceOpen) return true;
  if (!responsibilitiesRequiringPhone(values)) return false;
  if (!person) return false;
  const effectivePhone = resolveEffectivePhone(person.phone, patch, touched);
  return !personHasValidPhone(effectivePhone);
}

export function buildContactPatchPayload(
  patch: ContactPatchDraft,
  touched: ContactPatchTouched,
): GuardianContactPatch | undefined {
  const payload: GuardianContactPatch = {};
  if (touched.phone && patch.phone.trim()) {
    payload.phone = moroccanPhoneSearchQuery(patch.phone);
  }
  if (touched.email && patch.email.trim()) {
    payload.email = patch.email.trim().toLowerCase();
  }
  return Object.keys(payload).length > 0 ? payload : undefined;
}

export function isGuardianLinkActionDisabled(
  values: RelationshipFormValues,
  options: {
    canLink: boolean;
    person: Pick<PersonSearchResult, 'missing_contact_fields' | 'phone' | 'email'> | null;
    patch: ContactPatchDraft;
    touched: ContactPatchTouched;
    isNewPerson: boolean;
    newPersonPhoneValid: boolean;
  },
): boolean {
  if (!options.canLink) return true;
  if (options.isNewPerson) return !options.newPersonPhoneValid;
  if (!options.person) return true;
  if (!responsibilitiesRequiringPhone(values)) return false;
  const effectivePhone = resolveEffectivePhone(options.person.phone, options.patch, options.touched);
  return !personHasValidPhone(effectivePhone);
}

export function isGuardianContactPhoneRequiredError(code: string): boolean {
  return code === 'guardian_contact_phone_required';
}
