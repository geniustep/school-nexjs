import type { ApiErrorBody } from '@/types/api';
import type { StudentHealthFieldErrors } from './student-health-profile';

export interface StudentHealthApiFieldErrors extends StudentHealthFieldErrors {
  general?: string;
}

export function mapStudentHealthApiError(
  error: ApiErrorBody,
  t: (key: string) => string,
): StudentHealthApiFieldErrors {
  const code = error.code;

  switch (code) {
    case 'student_health_forbidden':
    case 'forbidden':
      return { general: t('admin.student360.health.errors.forbidden') };
    case 'invalid_blood_type':
      return { bloodType: t('admin.student360.health.errors.invalidBloodType') };
    case 'invalid_insurance_expiry_date':
      return { insuranceExpiryDate: t('admin.student360.health.errors.invalidInsuranceExpiry') };
    case 'not_found':
      return { general: t('admin.student360.health.errors.notFound') };
    case 'allergies_description_required':
      return { allergiesDescription: t('admin.student360.health.errors.allergiesDescriptionRequired') };
    case 'chronic_conditions_description_required':
      return { chronicConditionsDescription: t('admin.student360.health.errors.chronicConditionsDescriptionRequired') };
    case 'regular_medication_description_required':
      return { regularMedicationDescription: t('admin.student360.health.errors.regularMedicationDescriptionRequired') };
    case 'special_needs_description_required':
      return { specialNeedsDescription: t('admin.student360.health.errors.specialNeedsDescriptionRequired') };
    case 'emergency_instructions_required':
      return { emergencyInstructions: t('admin.student360.health.errors.emergencyInstructionsRequired') };
    case 'validation_error':
      return { general: error.message || t('admin.studentValidation') };
    default:
      return { general: error.message || t('errors.generic') };
  }
}
