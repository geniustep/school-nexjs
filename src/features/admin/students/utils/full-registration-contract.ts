export type FullRegistrationFamilyContext =
  | 'parents_together'
  | 'separated_or_divorced'
  | 'single_guardian'
  | 'guardianship'
  | 'special';

export type FullRegistrationGuardianMode = 'new' | 'existing';

export interface FullRegistrationGuardianDraft {
  key: string;
  mode: FullRegistrationGuardianMode;
  relationshipType: string;
  linkedGuardianId?: number | null;
  linkedPersonId?: number | null;
  nameAr: string;
  nameFr: string;
  preferredLanguage: 'ar' | 'fr';
  phone: string;
  identity: string;
  legal: boolean;
  financial: boolean;
  pickup: boolean;
}

export interface FullRegistrationStudentDraft {
  firstNameAr: string;
  lastNameAr: string;
  firstNameFr: string;
  lastNameFr: string;
  gender: string;
  dateOfBirth: string;
  previousSchool: string;
  address: string;
}

export interface FullRegistrationAcademicDraft {
  schoolId: number | null;
  academicYearId: string;
  cycleId: string;
  levelId: string;
  enrollmentDate: string;
}

export interface FullRegistrationPricingAdjustment {
  itemKey: string;
  adjustedUnitPrice?: number | null;
  periodFrom?: string;
  periodTo?: string;
  reason: string;
}

export interface FullRegistrationBuildInput {
  academic: FullRegistrationAcademicDraft;
  student: FullRegistrationStudentDraft;
  familyContext: FullRegistrationFamilyContext;
  guardians: FullRegistrationGuardianDraft[];
  selectedServiceIds: number[];
  pricingAdjustments: FullRegistrationPricingAdjustment[];
}

export interface FullRegistrationValidationResult {
  valid: boolean;
  errors: string[];
  fieldErrors: Record<string, string>;
  fieldOrder: string[];
}

function clean(value: string): string {
  return value.trim();
}

function guardianIsSelected(guardian: FullRegistrationGuardianDraft): boolean {
  if (guardian.mode === 'existing') {
    return Boolean(guardian.linkedGuardianId || guardian.linkedPersonId);
  }
  return Boolean(clean(guardian.nameAr) || clean(guardian.nameFr) || clean(guardian.phone));
}

export function selectedFullRegistrationGuardians(
  guardians: FullRegistrationGuardianDraft[],
): FullRegistrationGuardianDraft[] {
  return guardians.filter(guardianIsSelected);
}

export function validateFullRegistrationDraft(
  input: FullRegistrationBuildInput,
): FullRegistrationValidationResult {
  const errors: string[] = [];
  const fieldErrors: Record<string, string> = {};
  const fieldOrder: string[] = [];
  const { academic, student, familyContext } = input;
  const guardians = selectedFullRegistrationGuardians(input.guardians);

  const addFieldError = (key: string, code: string) => {
    if (fieldErrors[key]) return;
    fieldErrors[key] = code;
    fieldOrder.push(key);
  };

  let academicContextMissing = false;
  if (!academic.schoolId) {
    academicContextMissing = true;
    addFieldError('academic.schoolId', 'academic_context_required');
  }
  if (!clean(academic.academicYearId)) {
    academicContextMissing = true;
    addFieldError('academic.academicYearId', 'academic_context_required');
  }
  if (!clean(academic.levelId)) {
    academicContextMissing = true;
    addFieldError('academic.levelId', 'academic_context_required');
  }
  if (academicContextMissing) errors.push('academic_context_required');

  if (!clean(academic.enrollmentDate)) {
    errors.push('enrollment_date_required');
    addFieldError('academic.enrollmentDate', 'enrollment_date_required');
  }

  let arabicNameMissing = false;
  if (!clean(student.firstNameAr)) {
    arabicNameMissing = true;
    addFieldError('student.firstNameAr', 'arabic_name_required');
  }
  if (!clean(student.lastNameAr)) {
    arabicNameMissing = true;
    addFieldError('student.lastNameAr', 'arabic_name_required');
  }
  if (arabicNameMissing) errors.push('arabic_name_required');

  let frenchNameMissing = false;
  if (!clean(student.firstNameFr)) {
    frenchNameMissing = true;
    addFieldError('student.firstNameFr', 'french_name_required');
  }
  if (!clean(student.lastNameFr)) {
    frenchNameMissing = true;
    addFieldError('student.lastNameFr', 'french_name_required');
  }
  if (frenchNameMissing) errors.push('french_name_required');

  if (!clean(student.gender)) {
    errors.push('gender_required');
    addFieldError('student.gender', 'gender_required');
  }
  if (!clean(student.dateOfBirth)) {
    errors.push('date_of_birth_required');
    addFieldError('student.dateOfBirth', 'date_of_birth_required');
  }

  const incompleteExistingGuardians = input.guardians.filter(
    (guardian) =>
      guardian.mode === 'existing' && !guardian.linkedGuardianId && !guardian.linkedPersonId,
  );

  if (guardians.length === 0) {
    errors.push('guardian_required');
    if (incompleteExistingGuardians.length === 0 && input.guardians[0]) {
      addFieldError(`guardian.${input.guardians[0].key}.card`, 'guardian_required');
    }
  }

  for (const guardian of incompleteExistingGuardians) {
    errors.push('guardian_selection_required');
    addFieldError(`guardian.${guardian.key}.selection`, 'guardian_selection_required');
  }

  for (const guardian of guardians) {
    if (guardian.mode === 'new') {
      if (!clean(guardian.nameAr) && !clean(guardian.nameFr)) {
        errors.push('guardian_name_required');
        addFieldError(`guardian.${guardian.key}.name`, 'guardian_name_required');
      }
      if (!clean(guardian.phone)) {
        errors.push('guardian_phone_required');
        addFieldError(`guardian.${guardian.key}.phone`, 'guardian_phone_required');
      }
    }
  }

  if (familyContext === 'separated_or_divorced' || familyContext === 'special') {
    const responsibleTarget = guardians[0] ?? incompleteExistingGuardians[0] ?? input.guardians[0];
    if (!guardians.some((guardian) => guardian.legal)) {
      errors.push('special_family_legal_responsible_required');
      if (responsibleTarget) {
        addFieldError(
          `guardian.${responsibleTarget.key}.legal`,
          'special_family_legal_responsible_required',
        );
      }
    }
    if (!guardians.some((guardian) => guardian.financial)) {
      errors.push('special_family_billing_responsible_required');
      if (responsibleTarget) {
        addFieldError(
          `guardian.${responsibleTarget.key}.financial`,
          'special_family_billing_responsible_required',
        );
      }
    }
  }

  for (const adjustment of input.pricingAdjustments) {
    const hasChange =
      adjustment.adjustedUnitPrice != null ||
      Boolean(clean(adjustment.periodFrom ?? '')) ||
      Boolean(clean(adjustment.periodTo ?? ''));
    if (!hasChange) continue;
    if (!clean(adjustment.reason)) errors.push('pricing_adjustment_reason_required');
    if (adjustment.adjustedUnitPrice != null && adjustment.adjustedUnitPrice < 0) {
      errors.push('pricing_adjustment_negative_price');
    }
    if (
      adjustment.periodFrom &&
      adjustment.periodTo &&
      adjustment.periodFrom > adjustment.periodTo
    ) {
      errors.push('pricing_adjustment_invalid_period');
    }
  }

  const uniqueErrors = Array.from(new Set(errors));
  return {
    valid: uniqueErrors.length === 0,
    errors: uniqueErrors,
    fieldErrors,
    fieldOrder,
  };
}

function buildGuardianRelationship(
  guardian: FullRegistrationGuardianDraft,
  familyContext: FullRegistrationFamilyContext,
): Record<string, unknown> {
  const relationship: Record<string, unknown> = {
    relationship_type: guardian.relationshipType,
    provision_access: true,
  };

  if (guardian.mode === 'existing') {
    if (guardian.linkedGuardianId) {
      relationship.guardian_id = guardian.linkedGuardianId;
    } else if (guardian.linkedPersonId) {
      relationship.person_id = guardian.linkedPersonId;
    }
  } else {
    relationship.guardian = {
      name: clean(guardian.nameAr) || clean(guardian.nameFr),
      name_ar: clean(guardian.nameAr) || undefined,
      name_fr: clean(guardian.nameFr) || undefined,
      preferred_language: guardian.preferredLanguage,
      phone: clean(guardian.phone),
      identity: clean(guardian.identity) || undefined,
      relationship_type: guardian.relationshipType,
    };
  }

  if (familyContext === 'separated_or_divorced' || familyContext === 'special') {
    relationship.legal_status = guardian.legal ? 'yes' : 'no';
    relationship.is_financial_responsible = guardian.financial;
    relationship.is_authorized_pickup = guardian.pickup;
  }

  return relationship;
}

export function buildFullRegistrationPayload(
  input: FullRegistrationBuildInput,
): Record<string, unknown> {
  const guardians = selectedFullRegistrationGuardians(input.guardians);
  const pricingAdjustments = input.pricingAdjustments
    .filter((adjustment) =>
      adjustment.adjustedUnitPrice != null ||
      Boolean(clean(adjustment.periodFrom ?? '')) ||
      Boolean(clean(adjustment.periodTo ?? '')),
    )
    .map((adjustment) => ({
      item_key: adjustment.itemKey,
      adjusted_unit_price: adjustment.adjustedUnitPrice ?? undefined,
      period_from: clean(adjustment.periodFrom ?? '') || undefined,
      period_to: clean(adjustment.periodTo ?? '') || undefined,
      reason: clean(adjustment.reason),
    }));

  return {
    first_name: clean(input.student.firstNameAr),
    last_name: clean(input.student.lastNameAr),
    name_ar: [clean(input.student.firstNameAr), clean(input.student.lastNameAr)]
      .filter(Boolean)
      .join(' '),
    name_latin: [clean(input.student.firstNameFr), clean(input.student.lastNameFr)]
      .filter(Boolean)
      .join(' '),
    gender: clean(input.student.gender),
    date_of_birth: clean(input.student.dateOfBirth),
    previous_school: clean(input.student.previousSchool) || undefined,
    residence_address: clean(input.student.address) || undefined,
    family_context: input.familyContext,
    academic: {
      school_id: input.academic.schoolId,
      academic_year_id: Number(input.academic.academicYearId),
      cycle_id: clean(input.academic.cycleId) ? Number(input.academic.cycleId) : undefined,
      level_id: Number(input.academic.levelId),
      enrollment_date: clean(input.academic.enrollmentDate),
    },
    enrollment: {
      actual_join_date: clean(input.academic.enrollmentDate),
      previous_school: clean(input.student.previousSchool) || undefined,
    },
    guardian_relationships: guardians.map((guardian) =>
      buildGuardianRelationship(guardian, input.familyContext),
    ),
    selected_service_ids: input.selectedServiceIds,
    pricing_adjustments: pricingAdjustments,
  };
}
