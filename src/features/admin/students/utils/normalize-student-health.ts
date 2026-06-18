import type {
  CriticalHealthItem,
  HealthAlertLevel,
  StudentHealthProfile,
  StudentHealthSummary,
} from '@/types/student-360';

const LEGACY_NEGATIVE_VALUES = new Set([
  '',
  '-',
  '—',
  'n/a',
  'na',
  'no',
  'none',
  'لا',
  'لا يوجد',
  'non',
  'aucun',
  'ninguno',
]);

export function isLegacyNegativeHealthText(value: string | null | undefined): boolean {
  if (value == null) return true;
  const trimmed = value.trim();
  if (!trimmed) return true;
  return LEGACY_NEGATIVE_VALUES.has(trimmed.toLowerCase());
}

/** Fallback when `has_*` flags are absent on legacy payloads. */
export function legacyHealthTextToTriState(
  value: string | null | undefined,
): { has: boolean | null; description: string | null } {
  if (value == null || value.trim() === '') {
    return { has: null, description: null };
  }
  if (isLegacyNegativeHealthText(value)) {
    return { has: false, description: null };
  }
  return { has: true, description: value.trim() };
}

function readBoolean(value: unknown): boolean | null | undefined {
  if (value === true || value === false) return value;
  if (value === null) return null;
  return undefined;
}

function readString(value: unknown): string | null | undefined {
  if (typeof value === 'string') return value;
  if (value === null) return null;
  return undefined;
}

function resolveTriState(
  hasFlag: unknown,
  description: unknown,
  legacyText: unknown,
): { has: boolean | null; description: string | null } {
  const explicitHas = readBoolean(hasFlag);
  const explicitDescription = readString(description);

  if (explicitHas !== undefined) {
    return {
      has: explicitHas,
      description: explicitHas === true ? (explicitDescription?.trim() || null) : null,
    };
  }

  return legacyHealthTextToTriState(readString(legacyText) ?? null);
}

function normalizeAlertLevel(value: unknown): HealthAlertLevel {
  if (value === 'critical' || value === 'warning' || value === 'none') return value;
  return 'none';
}

function normalizeCriticalItems(value: unknown): CriticalHealthItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => item && typeof item === 'object')
    .map((item) => {
      const raw = item as Record<string, unknown>;
      return {
        key: typeof raw.key === 'string' ? raw.key : typeof raw.code === 'string' ? raw.code : undefined,
        label: typeof raw.label === 'string' ? raw.label : typeof raw.title === 'string' ? raw.title : undefined,
        description:
          typeof raw.description === 'string'
            ? raw.description
            : typeof raw.value === 'string'
              ? raw.value
              : undefined,
      };
    })
    .filter((item) => item.label || item.description || item.key);
}

function profileHasData(raw: Record<string, unknown>): boolean {
  if (raw.has_profile === true) return true;
  if (raw.student_id != null) return true;
  if (readString(raw.blood_type)) return true;
  const signalKeys = [
    'has_allergies',
    'has_chronic_conditions',
    'has_regular_medication',
    'has_special_needs',
    'has_emergency_instructions',
    'allergies',
    'chronic_conditions',
    'regular_medications',
    'regular_medication',
    'special_needs',
    'health_emergency_instructions',
    'emergency_instructions',
    'doctor_name',
    'insurance_provider',
    'notes',
  ];
  return signalKeys.some((key) => raw[key] !== undefined && raw[key] !== null && raw[key] !== '');
}

export function normalizeStudentHealthProfile(raw: unknown): StudentHealthProfile | null {
  if (!raw || typeof raw !== 'object') return null;
  const source = raw as Record<string, unknown>;
  if (!profileHasData(source)) return null;

  const allergies = resolveTriState(source.has_allergies, source.allergies_description, source.allergies);
  const chronic = resolveTriState(
    source.has_chronic_conditions,
    source.chronic_conditions_description,
    source.chronic_conditions,
  );
  const medication = resolveTriState(
    source.has_regular_medication,
    source.regular_medication_description,
    source.regular_medications ?? source.regular_medication,
  );
  const specialNeeds = resolveTriState(
    source.has_special_needs,
    source.special_needs_description,
    source.special_needs,
  );
  const emergency = resolveTriState(
    source.has_emergency_instructions,
    source.emergency_instructions,
    source.health_emergency_instructions ?? source.emergency_instructions,
  );

  const health_alert_level = normalizeAlertLevel(source.health_alert_level);
  const has_critical_health_alert =
    source.has_critical_health_alert === true || health_alert_level === 'critical';

  return {
    student_id: typeof source.student_id === 'number' ? source.student_id : undefined,
    blood_type: readString(source.blood_type) ?? null,
    has_allergies: allergies.has,
    allergies_description: allergies.description,
    has_chronic_conditions: chronic.has,
    chronic_conditions_description: chronic.description,
    has_regular_medication: medication.has,
    regular_medication_description: medication.description,
    has_special_needs: specialNeeds.has,
    special_needs_description: specialNeeds.description,
    has_emergency_instructions: emergency.has,
    emergency_instructions: emergency.description,
    allergies: allergies.has === true ? allergies.description : allergies.has === false ? null : readString(source.allergies) ?? null,
    chronic_conditions:
      chronic.has === true ? chronic.description : chronic.has === false ? null : readString(source.chronic_conditions) ?? null,
    regular_medications:
      medication.has === true
        ? medication.description
        : medication.has === false
          ? null
          : readString(source.regular_medications ?? source.regular_medication) ?? null,
    special_needs:
      specialNeeds.has === true
        ? specialNeeds.description
        : specialNeeds.has === false
          ? null
          : readString(source.special_needs) ?? null,
    health_emergency_instructions:
      emergency.has === true
        ? emergency.description
        : emergency.has === false
          ? null
          : readString(source.health_emergency_instructions ?? source.emergency_instructions) ?? null,
    doctor_name: readString(source.doctor_name) ?? null,
    doctor_phone: readString(source.doctor_phone) ?? null,
    insurance_provider: readString(source.insurance_provider) ?? null,
    insurance_number: readString(source.insurance_number) ?? null,
    insurance_expiry_date: readString(source.insurance_expiry_date) ?? null,
    notes: readString(source.notes) ?? null,
    health_alert_level,
    has_critical_health_alert,
    has_critical_alert: has_critical_health_alert,
    critical_health_items: normalizeCriticalItems(source.critical_health_items),
    write_date: readString(source.write_date) ?? null,
  };
}

export function hasCriticalHealthAlert(
  source:
    | Pick<StudentHealthProfile, 'has_critical_health_alert' | 'has_critical_alert' | 'health_alert_level'>
    | Pick<StudentHealthSummary, 'has_critical_health_alert' | 'has_critical_alert' | 'health_alert_level'>
    | null
    | undefined,
): boolean {
  if (!source) return false;
  if (source.has_critical_health_alert === true) return true;
  if (source.health_alert_level === 'critical') return true;
  return false;
}

/** Normalize `health_summary` from GET /admin/students/{id} using the same alert rules as the health tab. */
export function normalizeStudentHealthSummary(raw: unknown): StudentHealthSummary | null {
  if (!raw || typeof raw !== 'object') return null;
  const source = raw as Record<string, unknown>;

  if (source.has_profile === false) {
    return {
      has_profile: false,
      health_alert_level: 'none',
      has_critical_health_alert: false,
      has_critical_alert: false,
    };
  }

  const has_profile = source.has_profile === true;
  if (!has_profile && !profileHasData(source)) return null;

  const profile = normalizeStudentHealthProfile(source);
  const health_alert_level = profile?.health_alert_level ?? normalizeAlertLevel(source.health_alert_level);
  const has_critical_health_alert = profile
    ? hasCriticalHealthAlert(profile)
    : source.has_critical_health_alert === true || health_alert_level === 'critical';

  return {
    has_profile,
    health_alert_level,
    has_critical_health_alert,
    has_critical_alert: has_critical_health_alert,
  };
}

export function resolveHealthAlertPresentation(profile: StudentHealthProfile | null | undefined) {
  if (!profile) {
    return {
      level: 'none' as HealthAlertLevel,
      showCritical: false,
      showWarning: false,
      showCalm: false,
      criticalItems: [] as CriticalHealthItem[],
    };
  }

  const level = profile.health_alert_level ?? 'none';
  const showCritical = hasCriticalHealthAlert(profile);
  const showWarning = !showCritical && level === 'warning';
  const showCalm = !showCritical && !showWarning && level === 'none';
  const criticalItems = showCritical ? (profile.critical_health_items ?? []) : [];

  return { level, showCritical, showWarning, showCalm, criticalItems };
}

export function criticalItemFieldKeys(items: CriticalHealthItem[]): Set<string> {
  return new Set(items.map((item) => item.key).filter((key): key is string => Boolean(key)));
}

export const CRITICAL_ITEM_LABEL_KEYS: Record<string, string> = {
  allergies: 'admin.student360.health.allergies',
  chronic_conditions: 'admin.student360.health.chronicConditions',
  regular_medication: 'admin.student360.health.regularMedications',
  regular_medications: 'admin.student360.health.regularMedications',
  special_needs: 'admin.student360.health.specialNeeds',
  emergency_instructions: 'admin.student360.health.emergencyInstructions',
  health_emergency_instructions: 'admin.student360.health.emergencyInstructions',
};

export function formatHealthTriStateValue(
  has: boolean | null | undefined,
  description: string | null | undefined,
  t: (key: string) => string,
): string {
  if (has === true) {
    const text = description?.trim();
    return text || t('common.yes');
  }
  if (has === false) return t('common.no');
  return t('admin.student360.health.unspecified');
}
