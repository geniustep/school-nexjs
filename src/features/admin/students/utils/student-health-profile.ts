import type { StudentHealthProfile, StudentHealthUpdatePayload } from '@/types/student-360';

export type HealthTriState = boolean | null;

export interface StudentHealthFormState {
  bloodType: string;
  hasAllergies: HealthTriState;
  allergiesDescription: string;
  hasChronicConditions: HealthTriState;
  chronicConditionsDescription: string;
  hasRegularMedication: HealthTriState;
  regularMedicationDescription: string;
  hasSpecialNeeds: HealthTriState;
  specialNeedsDescription: string;
  hasEmergencyInstructions: HealthTriState;
  emergencyInstructions: string;
  doctorName: string;
  doctorPhone: string;
  insuranceProvider: string;
  insuranceNumber: string;
  insuranceExpiryDate: string;
  notes: string;
}

function trim(value: string): string {
  return value.trim();
}

function optionalString(value: string): string | undefined {
  const v = trim(value);
  return v || undefined;
}

export function defaultStudentHealthFormState(): StudentHealthFormState {
  return {
    bloodType: '',
    hasAllergies: null,
    allergiesDescription: '',
    hasChronicConditions: null,
    chronicConditionsDescription: '',
    hasRegularMedication: null,
    regularMedicationDescription: '',
    hasSpecialNeeds: null,
    specialNeedsDescription: '',
    hasEmergencyInstructions: null,
    emergencyInstructions: '',
    doctorName: '',
    doctorPhone: '',
    insuranceProvider: '',
    insuranceNumber: '',
    insuranceExpiryDate: '',
    notes: '',
  };
}

export function studentHealthFormStateFromProfile(
  profile: StudentHealthProfile | null | undefined,
): StudentHealthFormState {
  const base = defaultStudentHealthFormState();
  if (!profile) return base;

  return {
    bloodType: profile.blood_type ?? '',
    hasAllergies: profile.has_allergies ?? null,
    allergiesDescription: profile.allergies_description ?? '',
    hasChronicConditions: profile.has_chronic_conditions ?? null,
    chronicConditionsDescription: profile.chronic_conditions_description ?? '',
    hasRegularMedication: profile.has_regular_medication ?? null,
    regularMedicationDescription: profile.regular_medication_description ?? '',
    hasSpecialNeeds: profile.has_special_needs ?? null,
    specialNeedsDescription: profile.special_needs_description ?? '',
    hasEmergencyInstructions: profile.has_emergency_instructions ?? null,
    emergencyInstructions: profile.emergency_instructions ?? '',
    doctorName: profile.doctor_name ?? '',
    doctorPhone: profile.doctor_phone ?? '',
    insuranceProvider: profile.insurance_provider ?? '',
    insuranceNumber: profile.insurance_number ?? '',
    insuranceExpiryDate: profile.insurance_expiry_date ?? '',
    notes: profile.notes ?? '',
  };
}

type TriStateField = {
  hasKey: keyof StudentHealthUpdatePayload;
  descriptionKey: keyof StudentHealthUpdatePayload;
  hasState: keyof StudentHealthFormState;
  descriptionState: keyof StudentHealthFormState;
};

const TRI_STATE_FIELDS: TriStateField[] = [
  {
    hasKey: 'has_allergies',
    descriptionKey: 'allergies_description',
    hasState: 'hasAllergies',
    descriptionState: 'allergiesDescription',
  },
  {
    hasKey: 'has_chronic_conditions',
    descriptionKey: 'chronic_conditions_description',
    hasState: 'hasChronicConditions',
    descriptionState: 'chronicConditionsDescription',
  },
  {
    hasKey: 'has_regular_medication',
    descriptionKey: 'regular_medication_description',
    hasState: 'hasRegularMedication',
    descriptionState: 'regularMedicationDescription',
  },
  {
    hasKey: 'has_special_needs',
    descriptionKey: 'special_needs_description',
    hasState: 'hasSpecialNeeds',
    descriptionState: 'specialNeedsDescription',
  },
  {
    hasKey: 'has_emergency_instructions',
    descriptionKey: 'emergency_instructions',
    hasState: 'hasEmergencyInstructions',
    descriptionState: 'emergencyInstructions',
  },
];

function appendTriStateField(
  payload: StudentHealthUpdatePayload,
  current: StudentHealthFormState,
  original: StudentHealthFormState,
  field: TriStateField,
  partial: boolean,
) {
  const currentHas = current[field.hasState] as HealthTriState;
  const originalHas = original[field.hasState] as HealthTriState;
  const currentDescription = trim(current[field.descriptionState] as string);
  const originalDescription = trim(original[field.descriptionState] as string);

  const hasChanged = currentHas !== originalHas;
  const descriptionChanged = currentDescription !== originalDescription;

  if (partial && !hasChanged && !descriptionChanged) return;

  const target = payload as Record<string, boolean | null | string | undefined>;

  if (!partial || hasChanged) {
    target[field.hasKey] = currentHas;
  }

  if (currentHas === true) {
    if (!partial || descriptionChanged || hasChanged) {
      target[field.descriptionKey] = currentDescription || null;
    }
  } else if (currentHas === false) {
    if (!partial || hasChanged || originalDescription) {
      target[field.descriptionKey] = null;
    }
  } else if (!partial || hasChanged) {
    target[field.descriptionKey] = null;
  }
}

type StringHealthPayloadKey =
  | 'doctor_name'
  | 'doctor_phone'
  | 'insurance_provider'
  | 'insurance_number'
  | 'insurance_expiry_date'
  | 'notes';

const STRING_FIELD_PAIRS: Array<[StringHealthPayloadKey, keyof StudentHealthFormState]> = [
  ['doctor_name', 'doctorName'],
  ['doctor_phone', 'doctorPhone'],
  ['insurance_provider', 'insuranceProvider'],
  ['insurance_number', 'insuranceNumber'],
  ['insurance_expiry_date', 'insuranceExpiryDate'],
  ['notes', 'notes'],
];

export function buildStudentHealthPartialUpdatePayload(
  current: StudentHealthFormState,
  original: StudentHealthFormState,
): StudentHealthUpdatePayload {
  const payload: StudentHealthUpdatePayload = {};

  if (current.bloodType !== original.bloodType) {
    const v = optionalString(current.bloodType);
    if (v) payload.blood_type = v;
    else if (trim(original.bloodType)) payload.blood_type = '';
  }

  for (const field of TRI_STATE_FIELDS) {
    appendTriStateField(payload, current, original, field, true);
  }

  for (const [payloadKey, stateKey] of STRING_FIELD_PAIRS) {
    const currentValue = trim(current[stateKey] as string);
    const originalValue = trim(original[stateKey] as string);
    if (currentValue !== originalValue) {
      if (currentValue) payload[payloadKey] = currentValue;
      else if (originalValue) payload[payloadKey] = '';
    }
  }

  return payload;
}

export function buildStudentHealthCreatePayload(state: StudentHealthFormState): StudentHealthUpdatePayload {
  const payload: StudentHealthUpdatePayload = {};
  const v = optionalString(state.bloodType);
  if (v) payload.blood_type = v;

  for (const field of TRI_STATE_FIELDS) {
    appendTriStateField(payload, state, defaultStudentHealthFormState(), field, false);
  }

  for (const [payloadKey, stateKey] of STRING_FIELD_PAIRS) {
    const value = optionalString(state[stateKey] as string);
    if (value) payload[payloadKey] = value;
  }

  return payload;
}

export interface StudentHealthFieldErrors {
  bloodType?: string;
  insuranceExpiryDate?: string;
  allergiesDescription?: string;
  chronicConditionsDescription?: string;
  regularMedicationDescription?: string;
  specialNeedsDescription?: string;
  emergencyInstructions?: string;
}

export function validateStudentHealthForm(
  state: StudentHealthFormState,
  bloodTypeOptions: string[],
  t: (key: string) => string,
): { valid: boolean; errors: StudentHealthFieldErrors } {
  const errors: StudentHealthFieldErrors = {};

  if (state.bloodType && bloodTypeOptions.length > 0 && !bloodTypeOptions.includes(state.bloodType)) {
    errors.bloodType = t('admin.student360.health.errors.invalidBloodType');
  }

  if (state.hasAllergies === true && !trim(state.allergiesDescription)) {
    errors.allergiesDescription = t('admin.student360.health.errors.allergiesDescriptionRequired');
  }
  if (state.hasChronicConditions === true && !trim(state.chronicConditionsDescription)) {
    errors.chronicConditionsDescription = t('admin.student360.health.errors.chronicConditionsDescriptionRequired');
  }
  if (state.hasRegularMedication === true && !trim(state.regularMedicationDescription)) {
    errors.regularMedicationDescription = t('admin.student360.health.errors.regularMedicationDescriptionRequired');
  }
  if (state.hasSpecialNeeds === true && !trim(state.specialNeedsDescription)) {
    errors.specialNeedsDescription = t('admin.student360.health.errors.specialNeedsDescriptionRequired');
  }
  if (state.hasEmergencyInstructions === true && !trim(state.emergencyInstructions)) {
    errors.emergencyInstructions = t('admin.student360.health.errors.emergencyInstructionsRequired');
  }

  return { valid: Object.keys(errors).length === 0, errors };
}
