import type { RelationshipType } from '@/types/student-360';
import type { StudentCreateGuardianEntry } from '@/types/student-enrollment-finance';
import {
  emptyFamilyRegistrationFormState,
  type FamilyRegistrationFormState,
} from './family-registration-state';

export type FamilyRegistrationV2FamilyContext = 'together' | 'separated' | 'single';
export type FamilyRegistrationV2GuardianKey = 'father' | 'mother';

export type FamilyRegistrationV2ChildDraft = {
  localId: string;
  firstNameAr: string;
  lastNameAr: string;
  firstNameFr: string;
  lastNameFr: string;
  gender: string;
  dateOfBirth: string;
  previousSchool: string;
  address: string;
  academicYearId: string;
  cycleId: string;
  levelId: string;
  enrollmentDate: string;
};

export type FamilyRegistrationV2GuardianDraft = {
  key: FamilyRegistrationV2GuardianKey;
  mode: 'new' | 'existing';
  linkedGuardianId: number | null;
  name: string;
  alternateName: string;
  phone: string;
};

export type FamilyRegistrationV2GuardianDrafts = Record<
  FamilyRegistrationV2GuardianKey,
  FamilyRegistrationV2GuardianDraft
>;

function trim(value: string | null | undefined): string {
  return (value ?? '').trim();
}

export function familyRegistrationV2SelectedGuardianKeys(
  familyContext: FamilyRegistrationV2FamilyContext,
  singleGuardianKey: FamilyRegistrationV2GuardianKey,
): FamilyRegistrationV2GuardianKey[] {
  return familyContext === 'single' ? [singleGuardianKey] : ['father', 'mother'];
}

export function familyRegistrationV2SubmissionBlockCode(
  familyContext: FamilyRegistrationV2FamilyContext,
): 'SEPARATED_GUARDIAN_RIGHTS_CONTRACT_GAP' | null {
  return familyContext === 'separated'
    ? 'SEPARATED_GUARDIAN_RIGHTS_CONTRACT_GAP'
    : null;
}

function guardianName(draft: FamilyRegistrationV2GuardianDraft): string {
  return trim(draft.name);
}

function requireExistingGuardianId(
  draft: FamilyRegistrationV2GuardianDraft,
): number {
  const guardianId = draft.linkedGuardianId;
  if (typeof guardianId !== 'number' || guardianId <= 0) {
    throw new Error('family_v2_existing_guardian_profile_required');
  }
  return guardianId;
}

function additionalGuardianEntry(
  key: FamilyRegistrationV2GuardianKey,
  draft: FamilyRegistrationV2GuardianDraft,
): StudentCreateGuardianEntry {
  const entryKey = `family-v2-${key}`;
  const relationshipType = key as RelationshipType;
  if (draft.mode === 'existing') {
    return {
      kind: 'existing',
      entryKey,
      guardian_id: requireExistingGuardianId(draft),
      displayName: guardianName(draft) || '—',
      relationship_type: relationshipType,
      is_primary_contact: false,
      phone: trim(draft.phone) || undefined,
    };
  }
  return {
    kind: 'new',
    entryKey,
    full_name: guardianName(draft),
    relationship_type: relationshipType,
    is_primary_contact: false,
    phone: trim(draft.phone) || undefined,
  };
}

function primaryEntryKey(draft: FamilyRegistrationV2GuardianDraft): string {
  return draft.mode === 'existing'
    ? `existing-${requireExistingGuardianId(draft)}`
    : 'new-primary';
}

export function buildFamilyRegistrationV2CanonicalForm(options: {
  todayIso: string;
  familyContext: FamilyRegistrationV2FamilyContext;
  singleGuardianKey: FamilyRegistrationV2GuardianKey;
  billingGuardianKey: FamilyRegistrationV2GuardianKey;
  guardians: FamilyRegistrationV2GuardianDrafts;
  children: FamilyRegistrationV2ChildDraft[];
  defaultNationalityId?: string;
}): FamilyRegistrationFormState {
  const {
    todayIso,
    familyContext,
    singleGuardianKey,
    guardians,
    children,
    defaultNationalityId = '',
  } = options;
  const selectedKeys = familyRegistrationV2SelectedGuardianKeys(
    familyContext,
    singleGuardianKey,
  );
  const primaryKey = selectedKeys[0];
  const primary = guardians[primaryKey];
  const secondaryKey = selectedKeys[1];
  const secondary = secondaryKey ? guardians[secondaryKey] : null;
  const base = emptyFamilyRegistrationFormState(todayIso);

  if (primary.mode === 'existing') {
    requireExistingGuardianId(primary);
  }
  if (secondary?.mode === 'existing') {
    requireExistingGuardianId(secondary);
  }

  const additional = secondary
    ? additionalGuardianEntry(secondaryKey as FamilyRegistrationV2GuardianKey, secondary)
    : null;
  const additionalEntries = additional ? [additional] : [];
  const selectedBillingKey = selectedKeys.includes(options.billingGuardianKey)
    ? options.billingGuardianKey
    : primaryKey;
  const billingEntryKey =
    selectedBillingKey === primaryKey
      ? primaryEntryKey(primary)
      : additional?.entryKey ?? primaryEntryKey(primary);

  const primaryGuardianId =
    primary.mode === 'existing' ? requireExistingGuardianId(primary) : null;
  const primaryName = guardianName(primary);

  return {
    guardianHost: {
      ...base.guardianHost,
      nationalityId: defaultNationalityId || base.guardianHost.nationalityId,
      emergencyContactName: primaryName,
      emergencyRelationship: primaryKey,
      emergencyPhone: trim(primary.phone),
    },
    billing: {
      ...base.billing,
      responsibilitySelection: 'guardian',
      guardianSourceMode: primary.mode,
      linkedGuardianId: primaryGuardianId,
      linkedGuardianPersonId: null,
      guardianEntries: additionalEntries,
      billingGuardianEntryKey: billingEntryKey,
      additionalGuardianSourceModeByEntryKey: additional
        ? { [additional.entryKey]: secondary?.mode ?? 'new' }
        : {},
    },
    children: children.map((child, index) => {
      const profile = base.children[0].profile;
      const enrollmentDate = trim(child.enrollmentDate) || todayIso;
      const firstName = trim(child.firstNameAr);
      const lastName = trim(child.lastNameAr);
      const firstNameLatin = trim(child.firstNameFr);
      const lastNameLatin = trim(child.lastNameFr);
      return {
        localId: child.localId,
        collapsed: index > 0,
        relationshipByEntryKey: {},
        profile: {
          ...profile,
          firstName,
          lastName,
          firstNameLatin,
          lastNameLatin,
          nameAr: [firstName, lastName].filter(Boolean).join(' '),
          nameLatin: [firstNameLatin, lastNameLatin].filter(Boolean).join(' '),
          gender: trim(child.gender),
          dateOfBirth: trim(child.dateOfBirth),
          previousSchool: trim(child.previousSchool),
          residenceAddress: trim(child.address),
          academicYearId: trim(child.academicYearId),
          cycleId: trim(child.cycleId),
          levelId: trim(child.levelId),
          admissionDate: enrollmentDate,
          actualJoinDate: enrollmentDate,
          nationalityId: defaultNationalityId || profile.nationalityId,
        },
      };
    }),
    shared: {
      academicYearId: trim(children[0]?.academicYearId),
      residenceAddress: '',
      admissionDate: todayIso,
    },
  };
}
