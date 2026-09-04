import type {
  StudentQuickRegistrationGuardianInput,
  StudentQuickRegistrationLanguage,
  StudentQuickRegistrationPayload,
} from '@/types/student-quick-registration';
import type { RelationshipType } from '@/types/student-360';
import { todayIsoDate } from './student-profile';

export type StudentQuickCreateGuardianDraft = {
  name: string;
  phone: string;
  relationshipType: RelationshipType;
};

export type StudentQuickCreateInput = {
  language: StudentQuickRegistrationLanguage;
  firstName: string;
  lastName: string;
  cycleId: string;
  levelId: string;
  schoolId: number | null;
  academicYearId: number | null;
  guardianIsFinancialResponsible: boolean;
  createGuardian: boolean;
  guardians: StudentQuickCreateGuardianDraft[];
};

export type StudentQuickCreateValidation =
  | {
      valid: true;
      language: StudentQuickRegistrationLanguage;
      firstName: string;
      lastName: string;
      levelId: number;
      schoolId: number;
      academicYearId: number;
      guardianIsFinancialResponsible: boolean;
      guardians: StudentQuickRegistrationGuardianInput[];
    }
  | { valid: false; error: 'name' | 'cycle' | 'level' | 'context' | 'guardian' };

export function validateStudentQuickCreateInput(input: StudentQuickCreateInput): StudentQuickCreateValidation {
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  if (!firstName || !lastName) return { valid: false, error: 'name' };
  if (!input.cycleId.trim()) return { valid: false, error: 'cycle' };

  const levelId = Number(input.levelId);
  if (!Number.isFinite(levelId) || levelId <= 0) return { valid: false, error: 'level' };
  if (input.schoolId == null || input.schoolId <= 0 || input.academicYearId == null || input.academicYearId <= 0) {
    return { valid: false, error: 'context' };
  }

  const shouldCreateGuardians = input.guardianIsFinancialResponsible && input.createGuardian;
  const guardians: StudentQuickRegistrationGuardianInput[] = [];
  if (shouldCreateGuardians) {
    if (input.guardians.length === 0) return { valid: false, error: 'guardian' };
    for (const guardian of input.guardians) {
      const name = guardian.name.trim();
      const phone = guardian.phone.trim();
      const relationshipType = String(guardian.relationshipType ?? '').trim();
      if (!name || !phone || !relationshipType) return { valid: false, error: 'guardian' };
      guardians.push({ name, phone, relationship_type: guardian.relationshipType });
    }
  }

  return {
    valid: true,
    language: input.language,
    firstName,
    lastName,
    levelId,
    schoolId: input.schoolId,
    academicYearId: input.academicYearId,
    guardianIsFinancialResponsible: input.guardianIsFinancialResponsible,
    guardians,
  };
}

/**
 * Quick Registration V1 request. Odoo owns class selection, billing, finance,
 * service rules and durable post-registration processing.
 */
export function buildStudentQuickCreatePayload(
  input: Extract<StudentQuickCreateValidation, { valid: true }>,
  enrollmentDate = todayIsoDate(),
): StudentQuickRegistrationPayload {
  const selectedNamePair = input.language === 'ar'
    ? { first_name_ar: input.firstName, last_name_ar: input.lastName }
    : { first_name_fr: input.firstName, last_name_fr: input.lastName };

  return {
    ...selectedNamePair,
    status: 'active',
    active: true,
    admission_date: enrollmentDate,
    enrollment: { actual_join_date: enrollmentDate },
    academic: {
      school_id: input.schoolId,
      academic_year_id: input.academicYearId,
      level_id: input.levelId,
      enrollment_date: enrollmentDate,
    },
    quick_registration: {
      enabled: true,
      guardian_is_financial_responsible: input.guardianIsFinancialResponsible,
      create_guardians: input.guardianIsFinancialResponsible ? input.guardians : [],
      auto_finance_setup: true,
    },
  };
}
