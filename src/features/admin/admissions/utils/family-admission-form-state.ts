import { todayIsoDate } from '@/features/admin/students/utils/student-profile';
import {
  createPrimaryGuardianDraft,
  type GuardianDraft,
} from '@/features/admin/admissions/guardians';

export interface FamilyAdmissionChildFormState {
  localId: string;
  collapsed: boolean;
  child_first_name_ar: string;
  child_last_name_ar: string;
  child_first_name_fr: string;
  child_last_name_fr: string;
  gender: string;
  birth_date: string;
  requested_cycle_code: string;
  requested_level_id?: number;
  requested_stream_id?: number;
  previous_school: string;
  massar_code: string;
  use_different_address: boolean;
  residence_address: string;
  external_reference: string;
}

export interface FamilyAdmissionFamilyFormState {
  shared_address: string;
  notes: string;
  source_id?: number;
  academic_year_id?: number;
  first_contact_date: string;
}

export interface FamilyAdmissionFormState {
  family: FamilyAdmissionFamilyFormState;
  guardians: GuardianDraft[];
  children: FamilyAdmissionChildFormState[];
}

export const FAMILY_ADMISSION_MIN_CHILDREN = 2;
/** Soft UI cap — not a backend-imposed small limit. */
export const FAMILY_ADMISSION_MAX_CHILDREN = 20;

let childIdCounter = 0;

export function createFamilyChildLocalId(): string {
  childIdCounter += 1;
  return `fam-child-${Date.now()}-${childIdCounter}`;
}

export function emptyFamilyChildFormState(collapsed = false): FamilyAdmissionChildFormState {
  return {
    localId: createFamilyChildLocalId(),
    collapsed,
    child_first_name_ar: '',
    child_last_name_ar: '',
    child_first_name_fr: '',
    child_last_name_fr: '',
    gender: '',
    birth_date: '',
    requested_cycle_code: '',
    requested_level_id: undefined,
    requested_stream_id: undefined,
    previous_school: '',
    massar_code: '',
    use_different_address: false,
    residence_address: '',
    external_reference: '',
  };
}

export function emptyFamilyAdmissionFormState(today = todayIsoDate()): FamilyAdmissionFormState {
  return {
    family: {
      shared_address: '',
      notes: '',
      first_contact_date: today,
    },
    guardians: [createPrimaryGuardianDraft()],
    children: [emptyFamilyChildFormState(false), emptyFamilyChildFormState(false)],
  };
}

export function addFamilyChild(
  state: FamilyAdmissionFormState,
): FamilyAdmissionFormState {
  if (state.children.length >= FAMILY_ADMISSION_MAX_CHILDREN) return state;
  return {
    ...state,
    children: [...state.children, emptyFamilyChildFormState(false)],
  };
}

export function removeFamilyChild(
  state: FamilyAdmissionFormState,
  localId: string,
): FamilyAdmissionFormState {
  if (state.children.length <= FAMILY_ADMISSION_MIN_CHILDREN) return state;
  const children = state.children.filter((child) => child.localId !== localId);
  const validKeys = new Set(children.map((c) => c.localId));
  return {
    ...state,
    children,
    guardians: state.guardians.map((g) => ({
      ...g,
      linkedChildClientKeys: g.linkedChildClientKeys.filter((k) => validKeys.has(k)),
    })),
  };
}

export function updateFamilyChild(
  state: FamilyAdmissionFormState,
  localId: string,
  patch: Partial<FamilyAdmissionChildFormState>,
): FamilyAdmissionFormState {
  return {
    ...state,
    children: state.children.map((child) =>
      child.localId === localId ? { ...child, ...patch } : child,
    ),
  };
}

export function toggleFamilyChildCollapsed(
  state: FamilyAdmissionFormState,
  localId: string,
): FamilyAdmissionFormState {
  return {
    ...state,
    children: state.children.map((child) =>
      child.localId === localId ? { ...child, collapsed: !child.collapsed } : child,
    ),
  };
}
