export const FULL_REGISTRATION_DEFAULT_GENDER = 'male';
export const FULL_REGISTRATION_GUARDIAN_SEARCH_DEBOUNCE_MS = 120;

type AcademicYearOption = {
  id: number;
  name: string;
  code?: string | null;
  is_current?: boolean;
};

const GENDER_LABELS: Record<string, Record<string, string>> = {
  ar: { male: 'ذكر', female: 'أنثى' },
  en: { male: 'Male', female: 'Female' },
  fr: { male: 'Masculin', female: 'Féminin' },
  es: { male: 'Masculino', female: 'Femenino' },
};

export function alignAcademicYearsWithActiveContext(
  years: AcademicYearOption[],
  activeAcademicYearId: number | null,
): AcademicYearOption[] {
  if (activeAcademicYearId == null) return years;
  if (!years.some((year) => year.id === activeAcademicYearId)) return years;
  return years.map((year) => ({
    ...year,
    is_current: year.id === activeAcademicYearId,
  }));
}

export function fullRegistrationGenderLabel(
  locale: string,
  value: string,
  fallback: string,
): string {
  return GENDER_LABELS[locale]?.[value] ?? fallback;
}

export function fullRegistrationErrorMessageKey(code: string): string {
  if (code === 'guardian_identity_candidate_exists') return 'guardianDuplicate';
  if (
    code === 'special_family_billing_responsible_required' ||
    code === 'billing_responsibility_unresolved' ||
    code === 'billing_guardian_ambiguous' ||
    code === 'billing_partner_ambiguous'
  ) {
    return 'billingAmbiguous';
  }
  if (code === 'special_family_legal_responsible_required') return 'specialLegalError';
  if (
    code === 'guardian_access_user_provision_failed' ||
    code === 'guardian_account_provisioning_failed'
  ) {
    return 'accountFailed';
  }
  if (
    code === 'optional_service_not_eligible' ||
    code === 'optional_service_unknown' ||
    code === 'optional_service_ambiguous'
  ) {
    return 'serviceUnavailable';
  }
  if (code.includes('ambiguous') && code.includes('plan')) return 'planAmbiguous';
  if (code.includes('fee_plan') || code.includes('base_plan') || code === 'no_default_fee_plan_for_level') {
    return 'planMissing';
  }
  return 'genericError';
}
