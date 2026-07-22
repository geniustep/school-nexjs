import type { RelationshipType } from '@/types/student-360';
import type {
  StudentCreateBillingFormState,
  StudentCreateGuardianEntry,
} from '@/types/student-enrollment-finance';
import {
  defaultStudentProfileFormState,
  type StudentProfileFormState,
} from './student-profile';
import { defaultStudentCreateBillingFormState } from './student-create-billing-responsibility';

export const FAMILY_REGISTRATION_MIN_CHILDREN = 1;
export const FAMILY_REGISTRATION_MAX_CHILDREN = 10;

export type FamilyRegistrationWizardStep =
  | 'guardians'
  | 'children'
  | 'review'
  | 'result'
  | 'finance'
  | 'finance_result';

export type FamilyChildSubmitStatus =
  | 'pending'
  | 'queued'
  | 'submitting'
  | 'succeeded'
  | 'failed'
  | 'ambiguous'
  | 'blocked';

export interface FamilyRegistrationChildState {
  localId: string;
  collapsed: boolean;
  profile: StudentProfileFormState;
  /** Per-guardian relationship for this child; falls back to guardian entry default. */
  relationshipByEntryKey: Record<string, RelationshipType>;
}

export interface FamilyChildSubmitResult {
  localId: string;
  displayName: string;
  status: FamilyChildSubmitStatus;
  studentId?: number;
  /** School / student reference from batch response when provided. */
  studentReference?: string | null;
  /** True when Odoo returned a previously completed create for this child key. */
  replayed?: boolean;
  errorMessage?: string;
  errorCode?: string;
  /** True only when a clear API error response was received (not network ambiguity). */
  canRetrySafely: boolean;
  /** Aggregate batch status when available. */
  batchStatus?: 'completed' | 'partially_completed' | 'failed' | string;
}

export interface FamilyRegistrationSubmitState {
  phase: 'idle' | 'submitting' | 'completed';
  results: FamilyChildSubmitResult[];
  /** Prevents accidental full re-submit after any successful create. */
  lockedAgainstFullResubmit: boolean;
  /** Last batch idempotency key used for this draft attempt. */
  batchIdempotencyKey?: string | null;
  /** Aggregate status from the last batch response. */
  batchStatus?: 'completed' | 'partially_completed' | 'failed' | string | null;
}

export interface FamilyRegistrationFormState {
  /** Holds primary guardian contact fields used by the existing billing step. */
  guardianHost: StudentProfileFormState;
  billing: StudentCreateBillingFormState;
  children: FamilyRegistrationChildState[];
  /** Shared defaults copied onto new children (academic year, address, …). */
  shared: {
    academicYearId: string;
    residenceAddress: string;
    admissionDate: string;
  };
}

let childIdCounter = 0;

export function createFamilyRegistrationChildLocalId(): string {
  childIdCounter += 1;
  return `fam-reg-child-${Date.now()}-${childIdCounter}`;
}

export function emptyFamilyRegistrationChild(
  shared: FamilyRegistrationFormState['shared'],
  collapsed = false,
): FamilyRegistrationChildState {
  const profile = defaultStudentProfileFormState(null);
  return {
    localId: createFamilyRegistrationChildLocalId(),
    collapsed,
    profile: {
      ...profile,
      academicYearId: shared.academicYearId,
      residenceAddress: shared.residenceAddress,
      admissionDate: shared.admissionDate || profile.admissionDate,
    },
    relationshipByEntryKey: {},
  };
}

export function emptyFamilyRegistrationFormState(
  todayIso: string,
): FamilyRegistrationFormState {
  const shared = {
    academicYearId: '',
    residenceAddress: '',
    admissionDate: todayIso,
  };
  return {
    guardianHost: defaultStudentProfileFormState(null),
    billing: defaultStudentCreateBillingFormState(),
    children: [emptyFamilyRegistrationChild(shared, false)],
    shared,
  };
}

export function addFamilyRegistrationChild(
  state: FamilyRegistrationFormState,
): FamilyRegistrationFormState {
  if (state.children.length >= FAMILY_REGISTRATION_MAX_CHILDREN) return state;
  return {
    ...state,
    children: [...state.children, emptyFamilyRegistrationChild(state.shared, false)],
  };
}

export function removeFamilyRegistrationChild(
  state: FamilyRegistrationFormState,
  localId: string,
): FamilyRegistrationFormState {
  if (state.children.length <= FAMILY_REGISTRATION_MIN_CHILDREN) return state;
  return {
    ...state,
    children: state.children.filter((child) => child.localId !== localId),
  };
}

export function updateFamilyRegistrationChild(
  state: FamilyRegistrationFormState,
  localId: string,
  patch: Partial<Omit<FamilyRegistrationChildState, 'localId'>>,
): FamilyRegistrationFormState {
  return {
    ...state,
    children: state.children.map((child) =>
      child.localId === localId ? { ...child, ...patch } : child,
    ),
  };
}

export function patchFamilyRegistrationChildProfile(
  state: FamilyRegistrationFormState,
  localId: string,
  profilePatch: Partial<StudentProfileFormState>,
): FamilyRegistrationFormState {
  return {
    ...state,
    children: state.children.map((child) =>
      child.localId === localId
        ? { ...child, profile: { ...child.profile, ...profilePatch } }
        : child,
    ),
  };
}

export function applySharedDefaultsToChildren(
  state: FamilyRegistrationFormState,
): FamilyRegistrationFormState {
  const { academicYearId, residenceAddress, admissionDate } = state.shared;
  return {
    ...state,
    children: state.children.map((child) => ({
      ...child,
      profile: {
        ...child.profile,
        academicYearId: child.profile.academicYearId.trim()
          ? child.profile.academicYearId
          : academicYearId,
        residenceAddress: child.profile.residenceAddress.trim()
          ? child.profile.residenceAddress
          : residenceAddress,
        admissionDate: child.profile.admissionDate.trim()
          ? child.profile.admissionDate
          : admissionDate,
      },
    })),
  };
}

export function childDisplayName(profile: StudentProfileFormState): string {
  const ar = `${profile.firstName.trim()} ${profile.lastName.trim()}`.trim();
  if (ar) return ar;
  const latin = `${profile.firstNameLatin.trim()} ${profile.lastNameLatin.trim()}`.trim();
  return latin || '—';
}

export function emptyFamilyRegistrationSubmitState(): FamilyRegistrationSubmitState {
  return {
    phase: 'idle',
    results: [],
    lockedAgainstFullResubmit: false,
  };
}

export function guardiansForChild(
  entries: StudentCreateGuardianEntry[],
  relationshipByEntryKey: Record<string, RelationshipType>,
): StudentCreateGuardianEntry[] {
  return entries.map((entry) => {
    const override = relationshipByEntryKey[entry.entryKey];
    if (!override || override === entry.relationship_type) return entry;
    return { ...entry, relationship_type: override };
  });
}
