import type { StudentHealthProfile, StudentHealthUpdatePayload } from '@/types/student-360';

export interface StudentHealthFormState {
  bloodType: string;
  allergies: string;
  chronicConditions: string;
  regularMedications: string;
  specialNeeds: string;
  healthEmergencyInstructions: string;
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
    allergies: '',
    chronicConditions: '',
    regularMedications: '',
    specialNeeds: '',
    healthEmergencyInstructions: '',
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
    allergies: profile.allergies ?? '',
    chronicConditions: profile.chronic_conditions ?? '',
    regularMedications: profile.regular_medications ?? '',
    specialNeeds: profile.special_needs ?? '',
    healthEmergencyInstructions: profile.health_emergency_instructions ?? '',
    doctorName: profile.doctor_name ?? '',
    doctorPhone: profile.doctor_phone ?? '',
    insuranceProvider: profile.insurance_provider ?? '',
    insuranceNumber: profile.insurance_number ?? '',
    insuranceExpiryDate: profile.insurance_expiry_date ?? '',
    notes: profile.notes ?? '',
  };
}

function fieldChanged(a: string, b: string): boolean {
  return a !== b;
}

export function buildStudentHealthPartialUpdatePayload(
  current: StudentHealthFormState,
  original: StudentHealthFormState,
): StudentHealthUpdatePayload {
  const payload: StudentHealthUpdatePayload = {};

  const pairs: Array<[keyof StudentHealthUpdatePayload, keyof StudentHealthFormState]> = [
    ['blood_type', 'bloodType'],
    ['allergies', 'allergies'],
    ['chronic_conditions', 'chronicConditions'],
    ['regular_medications', 'regularMedications'],
    ['special_needs', 'specialNeeds'],
    ['health_emergency_instructions', 'healthEmergencyInstructions'],
    ['doctor_name', 'doctorName'],
    ['doctor_phone', 'doctorPhone'],
    ['insurance_provider', 'insuranceProvider'],
    ['insurance_number', 'insuranceNumber'],
    ['insurance_expiry_date', 'insuranceExpiryDate'],
    ['notes', 'notes'],
  ];

  for (const [payloadKey, stateKey] of pairs) {
    if (fieldChanged(current[stateKey], original[stateKey])) {
      const v = optionalString(current[stateKey]);
      if (v) payload[payloadKey] = v;
      else if (trim(original[stateKey])) {
        payload[payloadKey] = '';
      }
    }
  }

  return payload;
}

export function buildStudentHealthCreatePayload(
  state: StudentHealthFormState,
): StudentHealthUpdatePayload {
  const payload: StudentHealthUpdatePayload = {};
  const pairs: Array<[keyof StudentHealthUpdatePayload, keyof StudentHealthFormState]> = [
    ['blood_type', 'bloodType'],
    ['allergies', 'allergies'],
    ['chronic_conditions', 'chronicConditions'],
    ['regular_medications', 'regularMedications'],
    ['special_needs', 'specialNeeds'],
    ['health_emergency_instructions', 'healthEmergencyInstructions'],
    ['doctor_name', 'doctorName'],
    ['doctor_phone', 'doctorPhone'],
    ['insurance_provider', 'insuranceProvider'],
    ['insurance_number', 'insuranceNumber'],
    ['insurance_expiry_date', 'insuranceExpiryDate'],
    ['notes', 'notes'],
  ];
  for (const [payloadKey, stateKey] of pairs) {
    const v = optionalString(state[stateKey]);
    if (v) payload[payloadKey] = v;
  }
  return payload;
}

export interface StudentHealthFieldErrors {
  bloodType?: string;
  insuranceExpiryDate?: string;
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
  return { valid: Object.keys(errors).length === 0, errors };
}
