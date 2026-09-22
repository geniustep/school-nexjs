import type { GuardianDuplicateField } from '@/types/student-360';

export interface GuardianDuplicateSearchInput {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  identityDocumentNumber: string;
}

function fullName(input: GuardianDuplicateSearchInput): string {
  return [input.firstName.trim(), input.lastName.trim()].filter(Boolean).join(' ');
}

/**
 * Resolve the most relevant canonical person-search query after guardian
 * create-new is blocked. Identity/phone/email conflicts keep their exact key;
 * generic/staff-identity conflicts search by full name so the existing Staff
 * or Teacher person can be selected and linked explicitly.
 */
export function guardianDuplicateSearchQuery(
  field: GuardianDuplicateField | undefined,
  input: GuardianDuplicateSearchInput,
  normalizePhone: (value: string) => string,
): string {
  if (field === 'national_id') return input.identityDocumentNumber.trim();
  if (field === 'email') return input.email.trim().toLowerCase();
  if (field === 'phone') return normalizePhone(input.phone);
  return fullName(input);
}
