import type { AdmissionPrefill } from '@/types/admission';
import {
  extractAdmissionGuardianPrefillText,
  mapAdmissionPrefillToStudentProfile,
  resolveAdmissionGuardianSelection,
} from '@/features/admin/admissions/utils/admission-prefill-mapper';
import type {
  FullRegistrationFamilyContext,
  FullRegistrationGuardianDraft,
  FullRegistrationStudentDraft,
} from './full-registration-contract';

export type FullRegistrationAdmissionGuardianKey = 'father' | 'mother' | 'single';

export interface FullRegistrationAdmissionPrefillPatch {
  student: Partial<FullRegistrationStudentDraft>;
  academicYearId: string;
  levelId: string;
  enrollmentDate: string;
  familyContext: FullRegistrationFamilyContext | null;
  guardianKey: FullRegistrationAdmissionGuardianKey | null;
  guardian: FullRegistrationGuardianDraft | null;
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function text(value: unknown): string {
  if (value == null || value === false) return '';
  return String(value).trim();
}

function positiveId(value: unknown): number | null {
  const n = Number(value);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

function looksArabic(value: string): boolean {
  return /[\u0600-\u06ff]/.test(value);
}

function guardianNames(prefill: AdmissionPrefill): { nameAr: string; nameFr: string } {
  const raw = record(prefill.guardian);
  const snapshot = extractAdmissionGuardianPrefillText(prefill);
  const nameAr = text(raw.name_ar) || text(raw.name_arabic);
  const nameFr = text(raw.name_fr) || text(raw.name_latin) || text(raw.name_french);
  if (nameAr || nameFr) return { nameAr, nameFr };
  if (!snapshot.name) return { nameAr: '', nameFr: '' };
  return looksArabic(snapshot.name)
    ? { nameAr: snapshot.name, nameFr: '' }
    : { nameAr: '', nameFr: snapshot.name };
}

function guardianTarget(relationship: string): {
  key: FullRegistrationAdmissionGuardianKey;
  relationshipType: string;
  familyContext: FullRegistrationFamilyContext | null;
} {
  const normalized = relationship.trim().toLowerCase();
  if (normalized === 'father' || normalized === 'père' || normalized === 'pere') {
    return { key: 'father', relationshipType: 'father', familyContext: null };
  }
  if (normalized === 'mother' || normalized === 'mère' || normalized === 'mere') {
    return { key: 'mother', relationshipType: 'mother', familyContext: null };
  }
  return {
    key: 'single',
    relationshipType: normalized || 'legal_guardian',
    familyContext: 'single_guardian',
  };
}

export function parseFullRegistrationAdmissionId(value: string | null): number | null {
  if (!value || !/^\d+$/.test(value.trim())) return null;
  const id = Number(value.trim());
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export function mapAdmissionPrefillToFullRegistration(
  prefill: AdmissionPrefill,
): FullRegistrationAdmissionPrefillPatch {
  const profile = mapAdmissionPrefillToStudentProfile(prefill);
  const guardianSnapshot = extractAdmissionGuardianPrefillText(prefill);
  const guardianSelection = resolveAdmissionGuardianSelection(prefill);
  const rawGuardian = record(prefill.guardian);
  const resolvedPersonId = positiveId(rawGuardian.person_id) ?? positiveId(rawGuardian.partner_id);
  const relationship =
    guardianSnapshot.relationship ||
    text(rawGuardian.guardian_relationship) ||
    text(rawGuardian.relationship_type);
  const names = guardianNames(prefill);
  const hasGuardianSnapshot = Boolean(
    names.nameAr ||
      names.nameFr ||
      guardianSnapshot.phone ||
      guardianSelection.guardianId ||
      resolvedPersonId,
  );

  let guardianKey: FullRegistrationAdmissionGuardianKey | null = null;
  let familyContext: FullRegistrationFamilyContext | null = null;
  let guardian: FullRegistrationGuardianDraft | null = null;

  if (hasGuardianSnapshot) {
    const target = guardianTarget(relationship);
    const existing = Boolean(guardianSelection.guardianId || resolvedPersonId);
    guardianKey = target.key;
    familyContext = target.familyContext;
    guardian = {
      key: target.key,
      mode: existing ? 'existing' : 'new',
      relationshipType: target.relationshipType,
      linkedGuardianId: guardianSelection.guardianId,
      linkedPersonId: guardianSelection.guardianId ? null : resolvedPersonId,
      nameAr: names.nameAr,
      nameFr: names.nameFr,
      preferredLanguage: text(rawGuardian.preferred_language).toLowerCase() === 'fr' ? 'fr' : 'ar',
      phone: guardianSnapshot.phone,
      identity:
        text(rawGuardian.identity_document_number) ||
        text(rawGuardian.identity) ||
        text(rawGuardian.cin) ||
        text(rawGuardian.national_id),
      legal: false,
      financial: false,
      pickup: true,
    };
  }

  const gender = text(profile.gender);

  return {
    student: {
      firstNameAr: profile.firstName ?? '',
      lastNameAr: profile.lastName ?? '',
      firstNameFr: profile.firstNameLatin ?? '',
      lastNameFr: profile.lastNameLatin ?? '',
      ...(gender ? { gender } : {}),
      dateOfBirth: profile.dateOfBirth ?? '',
      previousSchool: profile.previousSchool ?? '',
      address: profile.residenceAddress ?? '',
    },
    academicYearId: profile.academicYearId ?? '',
    levelId: profile.levelId ?? '',
    enrollmentDate: profile.actualJoinDate || profile.admissionDate || '',
    familyContext,
    guardianKey,
    guardian,
  };
}
