import type { ApiErrorBody } from '@/types/api';

export interface StudentHealthFieldErrors {
  bloodType?: string;
  insuranceExpiryDate?: string;
  general?: string;
}

export function mapStudentHealthApiError(
  error: ApiErrorBody,
  t: (key: string) => string,
): StudentHealthFieldErrors {
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
    case 'validation_error':
      return { general: error.message || t('admin.studentValidation') };
    default:
      return { general: error.message || t('errors.generic') };
  }
}
