import type { FullRegistrationGuardianDraft } from './full-registration-contract';

export function fullRegistrationNameFieldOrder(locale: string): {
  arabic: number;
  latin: number;
} {
  return locale === 'ar'
    ? { arabic: -2, latin: -1 }
    : { arabic: -1, latin: -2 };
}

export function buildFullRegistrationGuardianSuggestionQuery(
  draft: Pick<FullRegistrationGuardianDraft, 'identity' | 'phone' | 'nameAr' | 'nameFr'>,
): string {
  const identity = draft.identity.trim();
  if (identity.length >= 2) return identity;

  const phone = draft.phone.trim();
  if (phone.replace(/\D/g, '').length >= 8) return phone;

  const nameAr = draft.nameAr.trim();
  if (nameAr.length >= 2) return nameAr;

  const nameFr = draft.nameFr.trim();
  if (nameFr.length >= 2) return nameFr;

  return '';
}

export function fullRegistrationPricingPeriodDefaults(referenceDate: string): {
  from: string;
  to: string;
} {
  const match = /^(\d{4})-(\d{2})/.exec(referenceDate.trim());
  if (!match) return { from: '', to: '' };

  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!Number.isInteger(year) || month < 1 || month > 12) return { from: '', to: '' };

  const currentMonth = `${year}-${String(month).padStart(2, '0')}`;
  if (month >= 9) {
    return { from: currentMonth, to: `${year + 1}-06` };
  }
  if (month <= 6) {
    return { from: currentMonth, to: `${year}-06` };
  }
  return { from: `${year}-09`, to: `${year + 1}-06` };
}

type GuardianSearchNameSource = {
  name?: string | null;
  name_ar?: string | null;
  name_latin?: string | null;
};

export function fullRegistrationGuardianDisplayNames(
  person: GuardianSearchNameSource,
): string[] {
  const values = [person.name_ar, person.name_latin, person.name]
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .filter(Boolean);
  return Array.from(new Set(values));
}

export function buildFullRegistrationCollectNowHref(params: {
  studentId: number;
  academicYearId?: string | number | null;
  billingPartnerId?: number | null;
  returnTo?: string | null;
}): string {
  const query = new URLSearchParams();
  query.set('student_id', String(params.studentId));
  if (params.academicYearId != null && String(params.academicYearId).trim()) {
    query.set('academic_year_id', String(params.academicYearId));
  }
  if (params.billingPartnerId != null && params.billingPartnerId > 0) {
    query.set('billing_partner_id', String(params.billingPartnerId));
  }
  if (params.returnTo?.trim()) query.set('returnTo', params.returnTo.trim());
  return `/admin/finance/collections/new?${query.toString()}`;
}
