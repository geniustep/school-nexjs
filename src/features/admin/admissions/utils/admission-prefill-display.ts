type TranslateFn = (key: string, params?: Record<string, string | number>) => string;

const PREFILL_MESSAGE_KEYS: Record<string, string> = {
  'No proposed class selected.': 'admin.admissions.prefill.messages.noProposedClass',
  'Registration offer is not accepted yet.': 'admin.admissions.prefill.messages.offerNotAccepted',
  'Application is not confirmed yet.': 'admin.admissions.prefill.messages.applicationNotConfirmed',
  'Guardian contact information is missing.': 'admin.admissions.prefill.messages.guardianContactMissing',
  'Student name is missing.': 'admin.admissions.prefill.messages.studentNameMissing',
  'Birth date is missing.': 'admin.admissions.prefill.messages.birthDateMissing',
  'Gender is missing.': 'admin.admissions.prefill.messages.genderMissing',
  'Requested level is missing.': 'admin.admissions.prefill.messages.requestedLevelMissing',
  'Academic year is missing.': 'admin.admissions.prefill.messages.academicYearMissing',
};

const FIELD_LABEL_KEYS: Record<string, string> = {
  student_name: 'admin.admissions.fields.studentName',
  child_full_name: 'admin.admissions.fields.fullName',
  child_first_name_ar: 'admin.admissions.fields.firstNameAr',
  child_last_name_ar: 'admin.admissions.fields.lastNameAr',
  child_first_name_fr: 'admin.admissions.fields.firstNameFr',
  child_last_name_fr: 'admin.admissions.fields.lastNameFr',
  name_ar: 'admin.admissions.fields.fullNameAr',
  name_latin: 'admin.admissions.fields.fullNameLatin',
  first_name: 'admin.admissions.fields.firstNameFr',
  last_name: 'admin.admissions.fields.lastNameFr',
  first_name_ar: 'admin.admissions.fields.firstNameAr',
  last_name_ar: 'admin.admissions.fields.lastNameAr',
  birth_date: 'admin.admissions.fields.birthDate',
  gender: 'admin.admissions.fields.gender',
  massar_code: 'admin.admissions.fields.massarCode',
  previous_school: 'admin.admissions.fields.previousSchool',
  name: 'admin.admissions.fields.guardianName',
  phone: 'admin.admissions.fields.guardianPhone',
  email: 'admin.admissions.fields.guardianEmail',
  relationship: 'admin.admissions.fields.relationship',
  guardian_relationship: 'admin.admissions.fields.relationship',
  school_id: 'admin.admissions.prefill.fields.school',
  academic_year_id: 'admin.admissions.fields.academicYear',
  requested_level_id: 'admin.admissions.fields.requestedLevel',
  requested_class_id: 'admin.admissions.fields.requestedClass',
  decision: 'admin.admissions.decision.label',
  offer_state: 'admin.admissions.registration.prefillOfferState',
  reference: 'admin.admissions.table.reference',
  state: 'admin.admissions.table.state',
  conditions: 'admin.admissions.decision.conditions',
  required_documents: 'admin.admissions.offers.requiredDocuments',
};

const SECTION_FIELDS: Record<string, string[]> = {
  student: [
    'child_first_name_ar',
    'child_last_name_ar',
    'child_first_name_fr',
    'child_last_name_fr',
    'child_full_name',
    'birth_date',
    'gender',
    'massar_code',
    'previous_school',
  ],
  guardian: ['name', 'phone', 'email', 'relationship'],
  academic: ['school_id', 'academic_year_id', 'requested_level_id', 'requested_class_id'],
  admission: ['reference', 'state', 'decision', 'offer_state', 'conditions', 'required_documents'],
};

export function formatPrefillMessage(raw: string, t: TranslateFn): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;

  const candidates = [
    trimmed,
    trimmed.endsWith('.') ? trimmed.slice(0, -1) : `${trimmed}.`,
  ];

  for (const candidate of candidates) {
    const key = PREFILL_MESSAGE_KEYS[candidate];
    if (key) {
      const translated = t(key);
      if (translated !== key) return translated;
    }
  }

  return trimmed;
}

function formatGender(value: string, t: TranslateFn): string {
  const key = `admin.admissions.gender.${value}`;
  const translated = t(key);
  return translated !== key ? translated : value;
}

function formatDecision(value: string, t: TranslateFn): string {
  const key = `admin.admissions.decisions.${value}`;
  const translated = t(key);
  return translated !== key ? translated : value;
}

function formatOfferState(value: string, t: TranslateFn): string {
  const keys = [`admin.admissions.offerStates.${value}`, `admin.admissions.states.${value}`];
  for (const key of keys) {
    const translated = t(key);
    if (translated !== key) return translated;
  }
  return value;
}

function formatState(value: string, t: TranslateFn): string {
  const key = `admin.admissions.states.${value}`;
  const translated = t(key);
  return translated !== key ? translated : value;
}

export function formatPrefillFieldValue(key: string, value: unknown, t: TranslateFn): string {
  if (value == null || value === false || value === '') {
    return t('admin.admissions.detail.unspecified');
  }

  const raw = String(value).trim();
  if (!raw) return t('admin.admissions.detail.unspecified');

  if (key === 'gender') return formatGender(raw, t);
  if (key === 'decision') return formatDecision(raw, t);
  if (key === 'offer_state') return formatOfferState(raw, t);
  if (key === 'state') return formatState(raw, t);

  return raw;
}

export function prefillSectionRows(
  section: keyof typeof SECTION_FIELDS,
  data: unknown,
  t: TranslateFn,
): { fieldKey: string; label: string; value: string; dir?: 'ltr' }[] {
  if (!data || typeof data !== 'object') return [];

  const record = data as Record<string, unknown>;
  const fields = SECTION_FIELDS[section] ?? Object.keys(record);

  return fields.map((fieldKey) => {
    const labelKey = FIELD_LABEL_KEYS[fieldKey] ?? fieldKey;
    const label = t(labelKey);
    const value = formatPrefillFieldValue(fieldKey, record[fieldKey], t);
    const dir =
      fieldKey === 'phone' || fieldKey === 'whatsapp' || fieldKey === 'email' || fieldKey === 'massar_code'
        ? ('ltr' as const)
        : undefined;
    return {
      fieldKey,
      label: label !== labelKey ? label : fieldKey,
      value,
      dir,
    };
  });
}

export function hasPrefillSectionData(data: unknown): boolean {
  if (!data || typeof data !== 'object') return false;
  return Object.keys(data as Record<string, unknown>).length > 0;
}
