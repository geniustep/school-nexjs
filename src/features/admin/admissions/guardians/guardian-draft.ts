import type {
  AdmissionGuardianValidationError,
  GuardianDraft,
  GuardianIdentityDraft,
} from './types';

let guardianKeySeq = 0;

export function createGuardianClientKey(): string {
  guardianKeySeq += 1;
  return `adm-guardian-${Date.now()}-${guardianKeySeq}`;
}

export function emptyGuardianIdentityDraft(): GuardianIdentityDraft {
  return {
    documentType: '',
    documentNumber: '',
    documentNumberMasked: '',
    issuingCountry: '',
    issueDate: '',
    expiryDate: '',
    frontAttachmentId: undefined,
    backAttachmentId: undefined,
    verificationState: null,
  };
}

export function emptyGuardianDraft(options?: {
  isPrimaryContact?: boolean;
  appliesToAllChildren?: boolean;
}): GuardianDraft {
  return {
    clientKey: createGuardianClientKey(),
    name: '',
    phone: '',
    whatsapp: '',
    email: '',
    relationship: '',
    isPrimaryContact: options?.isPrimaryContact ?? false,
    isAccompanyingGuardian: false,
    appliesToAllChildren: options?.appliesToAllChildren ?? true,
    linkedChildClientKeys: [],
    identityDocument: emptyGuardianIdentityDraft(),
    identityOpen: false,
    identityDirty: false,
  };
}

export function createPrimaryGuardianDraft(): GuardianDraft {
  return emptyGuardianDraft({ isPrimaryContact: true, appliesToAllChildren: true });
}

export function setPrimaryGuardian(
  guardians: GuardianDraft[],
  clientKey: string,
): GuardianDraft[] {
  return guardians.map((g) => ({
    ...g,
    isPrimaryContact: g.clientKey === clientKey,
  }));
}

export function getPrimaryGuardian(guardians: GuardianDraft[]): GuardianDraft | undefined {
  return guardians.find((g) => g.isPrimaryContact) ?? guardians[0];
}

export function canRemoveGuardian(guardians: GuardianDraft[], clientKey: string): boolean {
  if (guardians.length <= 1) return false;
  const target = guardians.find((g) => g.clientKey === clientKey);
  if (!target) return false;
  if (!target.isPrimaryContact) return true;
  return guardians.some((g) => g.clientKey !== clientKey);
}

export function removeGuardianDraft(
  guardians: GuardianDraft[],
  clientKey: string,
): GuardianDraft[] {
  if (!canRemoveGuardian(guardians, clientKey)) return guardians;
  const next = guardians.filter((g) => g.clientKey !== clientKey);
  if (!next.some((g) => g.isPrimaryContact) && next.length > 0) {
    next[0] = { ...next[0], isPrimaryContact: true };
  }
  return next;
}

export function updateGuardianDraft(
  guardians: GuardianDraft[],
  clientKey: string,
  patch: Partial<GuardianDraft>,
): GuardianDraft[] {
  let next = guardians.map((g) => {
    if (g.clientKey !== clientKey) return g;
    const identityTouched = patch.identityDocument != null;
    return {
      ...g,
      ...patch,
      identityDirty: identityTouched ? true : (patch.identityDirty ?? g.identityDirty),
    };
  });
  if (patch.isPrimaryContact === true) {
    next = setPrimaryGuardian(next, clientKey);
  }
  return next;
}

export function guardianIdAlreadyLinked(
  guardians: GuardianDraft[],
  guardianId: number,
  exceptClientKey?: string,
): boolean {
  return guardians.some(
    (g) =>
      g.guardianId === guardianId &&
      (exceptClientKey == null || g.clientKey !== exceptClientKey),
  );
}

/** Drop deleted child keys from guardian links; used when a family child is removed. */
export function pruneGuardianChildLinks(
  guardians: GuardianDraft[],
  validChildKeys: Set<string>,
): GuardianDraft[] {
  return guardians.map((g) => ({
    ...g,
    linkedChildClientKeys: g.linkedChildClientKeys.filter((k) => validChildKeys.has(k)),
  }));
}

export function validateGuardianIdentity(
  identity: GuardianIdentityDraft,
): AdmissionGuardianValidationError | null {
  if (identity.documentType && !identity.documentNumber.trim()) {
    return {
      code: 'identity_number_required',
      messageKey: 'admin.admissions.guardians.errors.identityNumberRequired',
    };
  }
  if (identity.issueDate && identity.expiryDate && identity.expiryDate < identity.issueDate) {
    return {
      code: 'identity_dates_invalid',
      messageKey: 'admin.admissions.guardians.errors.identityDatesInvalid',
    };
  }
  return null;
}

export function validateGuardiansDraft(
  guardians: GuardianDraft[],
  options?: {
    mode: 'individual' | 'family';
    childClientKeys?: string[];
  },
): AdmissionGuardianValidationError | null {
  if (guardians.length === 0) {
    return {
      code: 'primary_required',
      messageKey: 'admin.admissions.guardians.errors.primaryRequired',
    };
  }

  const primaries = guardians.filter((g) => g.isPrimaryContact);
  if (primaries.length === 0) {
    return {
      code: 'primary_required',
      messageKey: 'admin.admissions.guardians.errors.primaryRequired',
    };
  }
  if (primaries.length > 1) {
    return {
      code: 'duplicate_primary',
      messageKey: 'admin.admissions.guardians.errors.duplicatePrimary',
    };
  }

  const seenIds = new Set<number>();
  for (const g of guardians) {
    if (g.guardianId != null) {
      if (seenIds.has(g.guardianId)) {
        return {
          code: 'duplicate_guardian_id',
          clientKey: g.clientKey,
          messageKey: 'admin.admissions.guardians.errors.duplicateGuardianId',
        };
      }
      seenIds.add(g.guardianId);
    }

    if (!g.name.trim() || !g.phone.trim()) {
      return {
        code: 'guardian_incomplete',
        clientKey: g.clientKey,
        messageKey: 'admin.admissions.guardians.errors.guardianIncomplete',
      };
    }

    if (g.identityDirty) {
      const identityError = validateGuardianIdentity(g.identityDocument);
      if (identityError) {
        return { ...identityError, clientKey: g.clientKey };
      }
    }

    if (options?.mode === 'family' && !g.appliesToAllChildren) {
      if (g.linkedChildClientKeys.length === 0) {
        return {
          code: 'family_children_required',
          clientKey: g.clientKey,
          messageKey: 'admin.admissions.guardians.errors.familyChildrenRequired',
        };
      }
      const valid = new Set(options.childClientKeys ?? []);
      if (g.linkedChildClientKeys.some((k) => !valid.has(k))) {
        return {
          code: 'family_children_required',
          clientKey: g.clientKey,
          messageKey: 'admin.admissions.guardians.errors.familyChildrenRequired',
        };
      }
    }
  }

  return null;
}
