import type { AdmissionLevelOption } from '@/types/admission';
import type { CreateFamilyBatchPayload, FamilyBatchChildPayload } from '@/types/admission';
import { buildAdmissionChildFullName } from './admission-child-name';
import { findAdmissionLevel } from './admission-options';
import {
  normalizeMassarCodeInput,
  isValidMassarCodeNormalized,
} from '@/features/admin/students/utils/massar-code';
import {
  deriveSharedContactFromPrimary,
  getPrimaryGuardian,
  serializeGuardiansPayload,
  validateGuardiansDraft,
} from '@/features/admin/admissions/guardians';
import {
  FAMILY_ADMISSION_MIN_CHILDREN,
  type FamilyAdmissionChildFormState,
  type FamilyAdmissionFamilyFormState,
  type FamilyAdmissionFormState,
} from './family-admission-form-state';

export type FamilyAdmissionValidationErrorCode =
  | 'too_few_children'
  | 'child_missing_fields'
  | 'invalid_massar'
  | 'family_missing_fields'
  | 'guardians_invalid';

export interface FamilyAdmissionValidationError {
  code: FamilyAdmissionValidationErrorCode;
  childIndex?: number;
  messageKey: string;
}

export function resolveChildResidenceAddress(
  child: FamilyAdmissionChildFormState,
  sharedAddress: string,
): string | undefined {
  const shared = sharedAddress.trim();
  if (child.use_different_address) {
    const override = child.residence_address.trim();
    return override || undefined;
  }
  return shared || undefined;
}

export function buildFamilyBatchChildPayload(
  child: FamilyAdmissionChildFormState,
  sharedAddress: string,
  levels: AdmissionLevelOption[],
): FamilyBatchChildPayload {
  const childName = buildAdmissionChildFullName(
    child.child_first_name_ar,
    child.child_last_name_ar,
    child.child_first_name_fr,
    child.child_last_name_fr,
  );
  const selectedLevel = findAdmissionLevel(levels, child.requested_level_id);
  const includeStream = Boolean(selectedLevel?.requires_stream && child.requested_stream_id);
  const massar = normalizeMassarCodeInput(child.massar_code);

  const payload: FamilyBatchChildPayload = {
    child_first_name_ar: child.child_first_name_ar.trim() || undefined,
    child_last_name_ar: child.child_last_name_ar.trim() || undefined,
    child_first_name_fr: child.child_first_name_fr.trim() || undefined,
    child_last_name_fr: child.child_last_name_fr.trim() || undefined,
    child_name: childName || undefined,
    birth_date: child.birth_date || undefined,
    gender: child.gender || undefined,
    requested_cycle_code: child.requested_cycle_code.trim() || undefined,
    requested_level_id: child.requested_level_id,
    requested_stream_id: includeStream ? child.requested_stream_id : undefined,
    previous_school: child.previous_school.trim() || undefined,
    massar_code: massar || undefined,
    residence_address: resolveChildResidenceAddress(child, sharedAddress),
    external_reference: child.external_reference.trim() || undefined,
  };

  for (const key of Object.keys(payload) as (keyof FamilyBatchChildPayload)[]) {
    const val = payload[key];
    if (val === '' || val === undefined) delete payload[key];
  }

  return payload;
}

export function buildCreateFamilyBatchPayload(
  form: FamilyAdmissionFormState,
  schoolId: number,
  idempotencyKey: string,
  levels: AdmissionLevelOption[] = [],
  options?: { childClientKeyToId?: Map<string, number> },
): CreateFamilyBatchPayload {
  const family = form.family;
  const sharedAddress = family.shared_address.trim();
  const childKeysInOrder = form.children.map((c) => c.localId);

  const sharedContact = deriveSharedContactFromPrimary(form.guardians);
  const guardians = serializeGuardiansPayload(form.guardians, {
    mode: 'family',
    childClientKeysInOrder: childKeysInOrder,
    childClientKeyToId: options?.childClientKeyToId,
  });

  const payload: CreateFamilyBatchPayload = {
    idempotency_key: idempotencyKey,
    school_id: schoolId,
    academic_year_id: family.academic_year_id,
    source_id: family.source_id,
    shared_contact: sharedContact,
    shared_address: sharedAddress || undefined,
    first_contact_date: family.first_contact_date || undefined,
    notes: family.notes.trim() || undefined,
    guardians,
    children: form.children.map((child) =>
      buildFamilyBatchChildPayload(child, sharedAddress, levels),
    ),
  };

  for (const key of Object.keys(payload) as (keyof Omit<
    CreateFamilyBatchPayload,
    'shared_contact' | 'children' | 'guardians' | 'idempotency_key' | 'school_id'
  >)[]) {
    const val = payload[key];
    if (val === '' || val === undefined) delete payload[key];
  }

  for (const key of Object.keys(payload.shared_contact) as (keyof typeof sharedContact)[]) {
    const val = payload.shared_contact[key];
    if (val === '' || val === undefined) delete payload.shared_contact[key];
  }

  return payload;
}

function childHasName(child: FamilyAdmissionChildFormState): boolean {
  return Boolean(
    child.child_first_name_ar.trim() ||
      child.child_last_name_ar.trim() ||
      child.child_first_name_fr.trim() ||
      child.child_last_name_fr.trim(),
  );
}

function validateChild(
  child: FamilyAdmissionChildFormState,
  index: number,
): FamilyAdmissionValidationError | null {
  // Admissions create: name + level required; birth_date and gender are optional.
  if (!childHasName(child) || !child.requested_level_id) {
    return {
      code: 'child_missing_fields',
      childIndex: index,
      messageKey: 'admin.admissions.family.errors.childMissingFields',
    };
  }

  const massar = normalizeMassarCodeInput(child.massar_code);
  if (massar && !isValidMassarCodeNormalized(massar)) {
    return {
      code: 'invalid_massar',
      childIndex: index,
      messageKey: 'admin.admissions.family.errors.invalidMassar',
    };
  }

  return null;
}

function validateFamilyMeta(
  family: FamilyAdmissionFamilyFormState,
): FamilyAdmissionValidationError | null {
  if (!family.academic_year_id) {
    return {
      code: 'family_missing_fields',
      messageKey: 'admin.admissions.family.errors.familyMissingFields',
    };
  }
  return null;
}

export function validateFamilyAdmissionForm(
  form: FamilyAdmissionFormState,
): FamilyAdmissionValidationError | null {
  if (form.children.length < FAMILY_ADMISSION_MIN_CHILDREN) {
    return {
      code: 'too_few_children',
      messageKey: 'admin.admissions.family.errors.tooFewChildren',
    };
  }

  const familyError = validateFamilyMeta(form.family);
  if (familyError) return familyError;

  const primary = getPrimaryGuardian(form.guardians);
  if (!primary?.name.trim() || !primary.phone.trim()) {
    return {
      code: 'family_missing_fields',
      messageKey: 'admin.admissions.family.errors.familyMissingFields',
    };
  }

  const guardiansError = validateGuardiansDraft(form.guardians, {
    mode: 'family',
    childClientKeys: form.children.map((c) => c.localId),
  });
  if (guardiansError) {
    return {
      code: 'guardians_invalid',
      messageKey: guardiansError.messageKey,
    };
  }

  for (let index = 0; index < form.children.length; index += 1) {
    const childError = validateChild(form.children[index], index);
    if (childError) return childError;
  }

  return null;
}
