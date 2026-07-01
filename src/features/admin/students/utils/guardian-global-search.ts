import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { EnrollmentIntakeValues } from '@/features/admin/enrollment-intake/types';
import type { PersonSearchResult } from '@/types/student-360';
import { isPhoneLikeQuery, moroccanPhoneSearchQuery } from './normalize-moroccan-phone';
import { normalizePersonSearchList } from './normalize-person-search';

export const GUARDIAN_GLOBAL_SEARCH_MIN_QUERY = 2;

export function buildGuardianDualSearchQuery(phone: string, name: string): string {
  const phoneTrim = phone.trim();
  const digits = phoneTrim.replace(/\D/g, '');
  if (phoneTrim && digits.length >= 8) {
    return moroccanPhoneSearchQuery(phoneTrim);
  }
  return name.trim();
}

export function hasGuardianDualSearchInput(phone: string, name: string): boolean {
  const phoneTrim = phone.trim();
  const nameTrim = name.trim();
  if (phoneTrim.replace(/\D/g, '').length >= 8) return true;
  return nameTrim.length >= GUARDIAN_GLOBAL_SEARCH_MIN_QUERY;
}

export function buildGuardianIntakeSearchQuery(
  values: Pick<EnrollmentIntakeValues, 'guardianName' | 'guardianPhone' | 'guardianEmail'>,
): string {
  const phone = values.guardianPhone.trim();
  if (phone) return moroccanPhoneSearchQuery(phone);
  const email = values.guardianEmail.trim();
  if (email) return email.toLowerCase();
  return values.guardianName.trim();
}

export async function searchGuardiansGlobally(params: {
  query: string;
  activeSchoolId?: number | null;
  limit?: number;
}): Promise<PersonSearchResult[]> {
  const trimmed = params.query.trim();
  if (trimmed.length < GUARDIAN_GLOBAL_SEARCH_MIN_QUERY) return [];

  const q = isPhoneLikeQuery(trimmed) ? moroccanPhoneSearchQuery(trimmed) : trimmed;
  const res = await api.get<PersonSearchResult[]>(endpoints.admin.guardiansSearch, {
    q,
    page: 1,
    page_size: params.limit ?? 5,
    active_school_id: params.activeSchoolId ?? undefined,
  });

  if (!res.success) return [];
  return normalizePersonSearchList(res.data).slice(0, params.limit ?? 5);
}
