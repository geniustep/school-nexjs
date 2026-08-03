type TranslateFn = (key: string, params?: Record<string, string | number>) => string;

const PREFILL_MESSAGE_KEYS: Record<string, string> = {
  'No proposed class selected.': 'admin.admissions.prefill.messages.noProposedClass',
  'Registration offer is not accepted yet.': 'admin.admissions.prefill.messages.offerNotAccepted',
  'Application is not confirmed yet.': 'admin.admissions.prefill.messages.applicationNotConfirmed',
  'Guardian contact information is missing.': 'admin.admissions.prefill.messages.guardianContactMissing',
  'Guardian phone is required.': 'admin.admissions.prefill.messages.guardianPhoneRequired',
  'Application is already linked to a student.': 'admin.admissions.prefill.messages.applicationAlreadyLinkedToStudent',
  'Student name is missing.': 'admin.admissions.prefill.messages.studentNameMissing',
  'Birth date is missing.': 'admin.admissions.prefill.messages.birthDateMissing',
  'Birth date is missing': 'admin.admissions.prefill.messages.birthDateMissing',
  'Gender is missing.': 'admin.admissions.prefill.messages.genderMissing',
  'Requested level is missing.': 'admin.admissions.prefill.messages.requestedLevelMissing',
  'Academic year is missing.': 'admin.admissions.prefill.messages.academicYearMissing',
  'Family batch guardian is available; confirm billing authority explicitly during registration if multiple guardians will be linked.':
    'admin.admissions.prefill.messages.familyBatchGuardianBillingHint',
  'Family application has multiple guardians.':
    'admin.admissions.prefill.messages.familyApplicationMultipleGuardians',
  'Family application has multiple guardians':
    'admin.admissions.prefill.messages.familyApplicationMultipleGuardians',
  'Billing responsibility is selected when registration starts.':
    'admin.admissions.prefill.messages.billingResponsibilityAtRegistrationStart',
  'Billing responsibility is selected when registration starts':
    'admin.admissions.prefill.messages.billingResponsibilityAtRegistrationStart',
  'Identity document is missing.': 'admin.admissions.prefill.messages.identityDocumentMissing',
  'Identity document is required.': 'admin.admissions.prefill.messages.identityDocumentRequired',
  'Guardian identity document is missing.': 'admin.admissions.prefill.messages.identityDocumentMissing',
  guardian_selection_required: 'admin.admissions.registration.errors.guardianSelectionRequired',
};

/** Backend registration_requirement / readiness codes → i18n keys. */
const REGISTRATION_REQUIREMENT_CODE_KEYS: Record<string, string> = {
  birth_date_missing: 'admin.admissions.prefill.messages.birthDateMissing',
  student_birth_date_missing: 'admin.admissions.prefill.messages.birthDateMissing',
  gender_missing: 'admin.admissions.prefill.messages.genderMissing',
  student_name_missing: 'admin.admissions.prefill.messages.studentNameMissing',
  requested_level_missing: 'admin.admissions.prefill.messages.requestedLevelMissing',
  academic_year_missing: 'admin.admissions.prefill.messages.academicYearMissing',
  guardian_contact_missing: 'admin.admissions.prefill.messages.guardianContactMissing',
  guardian_phone_required: 'admin.admissions.prefill.messages.guardianPhoneRequired',
  guardian_identity_missing: 'admin.admissions.prefill.messages.identityDocumentMissing',
  guardian_identity_number_missing:
    'admin.admissions.prefill.messages.identityDocumentNumberMissingFor',
  identity_document_missing: 'admin.admissions.prefill.messages.identityDocumentMissing',
  identity_document_required: 'admin.admissions.prefill.messages.identityDocumentRequired',
  offer_not_accepted: 'admin.admissions.prefill.messages.offerNotAccepted',
  application_not_confirmed: 'admin.admissions.prefill.messages.applicationNotConfirmed',
  family_multiple_guardians:
    'admin.admissions.prefill.messages.familyApplicationMultipleGuardians',
  multiple_guardians: 'admin.admissions.prefill.messages.familyApplicationMultipleGuardians',
  guardian_selection_required: 'admin.admissions.registration.errors.guardianSelectionRequired',
  billing_responsibility_at_registration:
    'admin.admissions.prefill.messages.billingResponsibilityAtRegistrationStart',
  billing_responsibility_selected_at_registration:
    'admin.admissions.prefill.messages.billingResponsibilityAtRegistrationStart',
};

const PREFILL_MESSAGE_PATTERNS: Array<{
  re: RegExp;
  key: string;
  params?: (match: RegExpMatchArray) => Record<string, string>;
}> = [
  {
    re: /^Identity document is missing for (.+?)\.?$/i,
    key: 'admin.admissions.prefill.messages.identityDocumentMissingFor',
    params: (match) => ({ name: match[1].trim() }),
  },
  {
    re: /^Guardian identity document is missing for (.+?)\.?$/i,
    key: 'admin.admissions.prefill.messages.identityDocumentMissingFor',
    params: (match) => ({ name: match[1].trim() }),
  },
  {
    re: /^Identity document number is missing(?: for (.+?))?\.?$/i,
    key: 'admin.admissions.prefill.messages.identityDocumentNumberMissingFor',
    params: (match) => ({ name: (match[1] ?? '').trim() }),
  },
];

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

function translatePrefillKey(
  key: string,
  t: TranslateFn,
  params?: Record<string, string | number>,
): string | null {
  const translated = t(key, params);
  return translated !== key ? translated : null;
}

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
      const translated = translatePrefillKey(key, t);
      if (translated) return translated;
    }
  }

  for (const pattern of PREFILL_MESSAGE_PATTERNS) {
    const match = trimmed.match(pattern.re);
    if (!match) continue;
    const params = pattern.params?.(match);
    // Prefer named variant; fall back to generic when name is empty.
    if (params && !String(params.name ?? '').trim()) {
      const generic = translatePrefillKey(
        'admin.admissions.prefill.messages.identityDocumentMissing',
        t,
      );
      if (generic) return generic;
    }
    const translated = translatePrefillKey(pattern.key, t, params);
    if (translated) return translated;
  }

  return trimmed;
}

export type RegistrationRequirementLike = {
  code?: string | null;
  key?: string | null;
  message?: string | null;
  label?: string | null;
  title?: string | null;
  description?: string | null;
  guardian_name?: string | null;
  name?: string | null;
  [key: string]: unknown;
};

function requirementNameParam(
  req: RegistrationRequirementLike,
): Record<string, string> | undefined {
  const name =
    (typeof req.guardian_name === 'string' && req.guardian_name.trim()) ||
    (typeof req.name === 'string' && req.name.trim()) ||
    '';
  return name ? { name } : undefined;
}

/**
 * Translate Backend registration_requirements / readiness warnings.
 * Prefer English message mapping (keeps guardian names); fall back to code keys.
 */
export function formatRegistrationRequirementMessage(
  req: RegistrationRequirementLike | string,
  t: TranslateFn,
): string {
  if (typeof req === 'string') {
    return formatPrefillMessage(req, t);
  }

  const message = String(
    req.message ?? req.label ?? req.title ?? req.description ?? '',
  ).trim();
  if (message) {
    const fromMessage = formatPrefillMessage(message, t);
    if (fromMessage !== message) return fromMessage;
  }

  const code = String(req.code ?? req.key ?? '').trim();
  if (code) {
    const key = REGISTRATION_REQUIREMENT_CODE_KEYS[code];
    if (key) {
      const params = requirementNameParam(req);
      // Named identity missing: keep name if present in params or message patterns already handled.
      if (
        (code === 'guardian_identity_missing' ||
          code === 'guardian_identity_number_missing') &&
        params?.name
      ) {
        const namedKey =
          code === 'guardian_identity_number_missing'
            ? 'admin.admissions.prefill.messages.identityDocumentNumberMissingFor'
            : 'admin.admissions.prefill.messages.identityDocumentMissingFor';
        const named = translatePrefillKey(namedKey, t, params);
        if (named) return named;
      }
      const translated = translatePrefillKey(key, t, params ?? { name: '—' });
      if (translated) return translated;
    }
  }

  return message || code;
}

/** Stable unique list key — codes alone collide when repeated per guardian. */
export function registrationRequirementListKey(
  req: RegistrationRequirementLike | string,
  index: number,
  prefix = 'req',
): string {
  if (typeof req === 'string') return `${prefix}-${index}-${req.slice(0, 40)}`;
  const code = String(req.code ?? req.key ?? 'item');
  const name = String(req.guardian_name ?? req.name ?? '').trim();
  const message = String(req.message ?? req.label ?? '').trim().slice(0, 48);
  return `${prefix}-${index}-${code}-${name || message || 'x'}`;
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
  if (!raw || raw.toLowerCase() === 'false') {
    return t('admin.admissions.detail.unspecified');
  }

  if (key === 'gender') return formatGender(raw, t);
  if (key === 'decision') return formatDecision(raw, t);
  if (key === 'offer_state') return formatOfferState(raw, t);
  if (key === 'state') return formatState(raw, t);
  if (key === 'relationship' || key === 'guardian_relationship') {
    const relKey = `admin.student360.relationshipType.${raw}`;
    const translated = t(relKey);
    return translated !== relKey ? translated : raw;
  }

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
