from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected exactly one match, found {count}\n--- OLD ---\n{old}")
    p.write_text(text.replace(old, new, 1))


def append_once(path: str, marker: str, addition: str) -> None:
    p = Path(path)
    text = p.read_text()
    if marker in text:
        raise SystemExit(f"{path}: addition already present: {marker}")
    p.write_text(text.rstrip() + "\n\n" + addition.rstrip() + "\n")


# 1) Student API types: person_id is a separate selector from guardian_id.
replace_once(
    "src/types/student-360.ts",
    """      provision_access?: boolean;\n    } & StudentCreateGuardianAccessMetadata)\n  | ({\n      guardian: StudentCreateGuardianIdentityPayload;""",
    """      provision_access?: boolean;\n    } & StudentCreateGuardianAccessMetadata)\n  | ({\n      /** Existing res.partner that does not need an existing school.parent profile. */\n      person_id: number;\n      relationship_type: RelationshipType;\n      is_primary_contact?: boolean;\n      is_legal_guardian?: boolean;\n      is_financial_responsible?: boolean;\n      receives_notifications?: boolean;\n      is_emergency_contact?: boolean;\n      is_authorized_pickup?: boolean;\n      provision_access?: boolean;\n    } & StudentCreateGuardianAccessMetadata)\n  | ({\n      guardian: StudentCreateGuardianIdentityPayload;""",
)

# 2) Wizard state/entry type can represent existing Person before school.parent exists.
replace_once(
    "src/types/student-enrollment-finance.ts",
    """  /** Canonical school.parent id — never partner_id */\n  guardian_id: number;""",
    """  /** Canonical school.parent id when a guardian profile already exists. */\n  guardian_id?: number;\n  /** Canonical res.partner id for an existing person that is not yet school.parent. */\n  person_id?: number;""",
)
replace_once(
    "src/types/student-enrollment-finance.ts",
    """  /** Canonical school.parent id selected from search — not partner_id */\n  linkedGuardianId: number | null;\n  /** Required when more than one guardian entry is submitted */""",
    """  /** Canonical school.parent id selected from search — not partner_id */\n  linkedGuardianId: number | null;\n  /** Canonical res.partner id selected from unified person search. */\n  linkedGuardianPersonId: number | null;\n  /** Required when more than one guardian entry is submitted */""",
)

# 3) Default billing state.
replace_once(
    "src/features/admin/students/utils/student-create-billing-responsibility.ts",
    """    guardianSourceMode: 'existing',\n    linkedGuardianId: null,\n    billingGuardianEntryKey: null,""",
    """    guardianSourceMode: 'existing',\n    linkedGuardianId: null,\n    linkedGuardianPersonId: null,\n    billingGuardianEntryKey: null,""",
)

# 4) Unified person search: generic id must never become school.parent id.
replace_once(
    "src/features/admin/students/utils/normalize-person-search.ts",
    """  const account = asRecord(raw.account);\n  return typeof account?.user_id === 'number' && account.user_id > 0;""",
    """  const account = asRecord(raw.account);\n  if (account?.has_user_account === true) return true;\n  return typeof account?.user_id === 'number' && account.user_id > 0;""",
)
replace_once(
    "src/features/admin/students/utils/normalize-person-search.ts",
    """  const has_user_account =\n    accountRaw?.has_user_account === true\n      ? true\n      : accountRaw?.has_user_account === false\n        ? false\n        : raw.has_user_account === true\n          ? true\n          : raw.has_user_account === false\n            ? false\n            : undefined;""",
    """  const canonicalHasUserAccount = readHasUserAccount(raw);\n  const has_user_account =\n    canonicalHasUserAccount\n      ? true\n      : accountRaw?.has_user_account === true\n        ? true\n        : accountRaw?.has_user_account === false\n          ? false\n          : raw.has_user_account === false\n            ? false\n            : undefined;""",
)
replace_once(
    "src/features/admin/students/utils/normalize-person-search.ts",
    """  const guardianId =\n    typeof raw.guardian_id === 'number'\n      ? raw.guardian_id\n      : typeof raw.id === 'number'\n        ? raw.id\n        : null;""",
    """  // Never infer school.parent from the generic `id`: unified search uses\n  // partner/person id as `id` when no guardian profile exists.\n  const guardianId =\n    typeof raw.guardian_id === 'number'\n      ? raw.guardian_id\n      : typeof raw.parent_id === 'number'\n        ? raw.parent_id\n        : null;\n  const personId =\n    typeof raw.person_id === 'number' && raw.person_id > 0\n      ? raw.person_id\n      : raw.partner_id;""",
)
replace_once(
    "src/features/admin/students/utils/normalize-person-search.ts",
    """  const hasUserAccount =\n    raw.has_user_account === true ||\n    accountInfo?.has_user_account === true ||\n    raw.has_user === true ||\n    raw.has_user_account === true ||\n    raw.has_account === true ||\n    (typeof raw.user_id === 'number' && raw.user_id > 0) ||\n    (asRecord(raw.account)?.user_id != null);""",
    """  const hasUserAccount = readHasUserAccount(raw) || accountInfo?.has_user_account === true;""",
)
replace_once(
    "src/features/admin/students/utils/normalize-person-search.ts",
    """    partner_id: raw.partner_id,\n    person_id: typeof raw.person_id === 'number' ? raw.person_id : undefined,\n    id: guardianId ?? raw.partner_id,\n    guardian_id: guardianId,""",
    """    partner_id: raw.partner_id,\n    person_id: personId,\n    id: guardianId ?? personId,\n    guardian_id: guardianId,""",
)

# 5) Account presentation: person/user evidence outranks guardian-profile no-account metadata.
replace_once(
    "src/features/admin/students/utils/resolve-guardian-account-presentation.ts",
    """  | Pick<GuardianSummary, 'code' | 'account' | 'has_user_account'>""",
    """  | Pick<GuardianSummary, 'code' | 'account' | 'has_user_account' | 'user_id'>""",
)
replace_once(
    "src/features/admin/students/utils/resolve-guardian-account-presentation.ts",
    """  const hasUserAccount =\n    account && 'has_user_account' in account && typeof account.has_user_account === 'boolean'\n      ? account.has_user_account\n      : source?.has_user_account;\n  const status = normalizeGuardianAccountPresentationStatus(readAccountStatus(account, source), {\n    hasUserAccount,\n  });""",
    """  const sourceProvesUser =\n    source?.has_user_account === true ||\n    (typeof source?.user_id === 'number' && source.user_id > 0);\n  const hasUserAccount = sourceProvesUser\n    ? true\n    : account && 'has_user_account' in account && typeof account.has_user_account === 'boolean'\n      ? account.has_user_account\n      : source?.has_user_account;\n  const rawStatus = readAccountStatus(account, source);\n  const normalizedRawStatus = trim(rawStatus)?.toLowerCase() ?? null;\n  const accountStatus =\n    hasUserAccount === true &&\n    (normalizedRawStatus === 'no_account' || normalizedRawStatus === 'not_created')\n      ? null\n      : rawStatus;\n  const status = normalizeGuardianAccountPresentationStatus(accountStatus, {\n    hasUserAccount,\n  });""",
)

# 6) Payload contract: explicit guardian_id vs person_id.
replace_once(
    "src/features/admin/students/utils/student-create-guardian-payload.ts",
    """export function resolvePersonSchoolParentId(person: Pick<PersonSearchResult, 'guardian_id' | 'id' | 'partner_id'>): number | null {\n  if (typeof person.guardian_id === 'number' && person.guardian_id > 0) {\n    return person.guardian_id;\n  }\n  if (\n    typeof person.id === 'number' &&\n    person.id > 0 &&\n    person.id !== person.partner_id\n  ) {\n    return person.id;\n  }\n  return null;\n}""",
    """export function resolvePersonSchoolParentId(\n  person: Pick<PersonSearchResult, 'guardian_id' | 'id' | 'partner_id'>,\n): number | null {\n  if (typeof person.guardian_id === 'number' && person.guardian_id > 0) {\n    return person.guardian_id;\n  }\n  return null;\n}\n\nexport function resolvePersonPartnerId(\n  person: Pick<PersonSearchResult, 'person_id' | 'partner_id'>,\n): number | null {\n  const id =\n    typeof person.person_id === 'number' && person.person_id > 0\n      ? person.person_id\n      : person.partner_id;\n  return typeof id === 'number' && id > 0 ? id : null;\n}""",
)
replace_once(
    "src/features/admin/students/utils/student-create-guardian-payload.ts",
    """  if (billingState.guardianSourceMode === 'existing') {\n    if (billingState.linkedGuardianId == null) return null;\n    const displayName = trim(profileState.emergencyContactName);\n    return {\n      kind: 'existing',\n      entryKey: `existing-${billingState.linkedGuardianId}`,\n      guardian_id: billingState.linkedGuardianId,""",
    """  if (billingState.guardianSourceMode === 'existing') {\n    if (billingState.linkedGuardianId == null && billingState.linkedGuardianPersonId == null) return null;\n    const displayName = trim(profileState.emergencyContactName);\n    const entryKey =\n      billingState.linkedGuardianId != null\n        ? `existing-${billingState.linkedGuardianId}`\n        : `person-${billingState.linkedGuardianPersonId}`;\n    return {\n      kind: 'existing',\n      entryKey,\n      ...(billingState.linkedGuardianId != null\n        ? { guardian_id: billingState.linkedGuardianId }\n        : {}),\n      ...(billingState.linkedGuardianPersonId != null\n        ? { person_id: billingState.linkedGuardianPersonId }\n        : {}),""",
)
replace_once(
    "src/features/admin/students/utils/student-create-guardian-payload.ts",
    """    if (entry.kind === 'existing') {\n      return {\n        guardian_id: entry.guardian_id,\n        ...relationshipFlags,\n      };\n    }""",
    """    if (entry.kind === 'existing') {\n      if (typeof entry.guardian_id === 'number' && entry.guardian_id > 0) {\n        return {\n          guardian_id: entry.guardian_id,\n          ...relationshipFlags,\n        };\n      }\n      return {\n        person_id: entry.person_id as number,\n        ...relationshipFlags,\n      };\n    }""",
)
replace_once(
    "src/features/admin/students/utils/student-create-guardian-payload.ts",
    """  if (billingEntry?.kind === 'existing') {\n    return {\n      mode: 'guardian',\n      billing_guardian_id: billingEntry.guardian_id,\n    };\n  }""",
    """  if (\n    billingEntry?.kind === 'existing' &&\n    typeof billingEntry.guardian_id === 'number' &&\n    billingEntry.guardian_id > 0\n  ) {\n    return {\n      mode: 'guardian',\n      billing_guardian_id: billingEntry.guardian_id,\n    };\n  }""",
)
replace_once(
    "src/features/admin/students/utils/student-create-guardian-payload.ts",
    """    billingState.guardianSourceMode === 'existing' &&\n    billingState.linkedGuardianId == null &&\n    (options?.requireExistingGuardianSelection ||""",
    """    billingState.guardianSourceMode === 'existing' &&\n    billingState.linkedGuardianId == null &&\n    billingState.linkedGuardianPersonId == null &&\n    (options?.requireExistingGuardianSelection ||""",
)

# 7) Additional guardian entries can carry person_id.
replace_once(
    "src/features/admin/students/utils/student-create-additional-guardians.ts",
    """  if (entry.kind === 'existing') {\n    return entry.guardian_id > 0 && trim(entry.displayName).length > 0;\n  }""",
    """  if (entry.kind === 'existing') {\n    return (\n      ((typeof entry.guardian_id === 'number' && entry.guardian_id > 0) ||\n        (typeof entry.person_id === 'number' && entry.person_id > 0)) &&\n      trim(entry.displayName).length > 0\n    );\n  }""",
)
replace_once(
    "src/features/admin/students/utils/student-create-additional-guardians.ts",
    """  if (primary?.kind === 'existing') {\n    ids.push(primary.guardian_id);\n  }""",
    """  if (primary?.kind === 'existing') {\n    if (typeof primary.guardian_id === 'number' && primary.guardian_id > 0) {\n      ids.push(primary.guardian_id);\n    }\n  }""",
)
replace_once(
    "src/features/admin/students/utils/student-create-additional-guardians.ts",
    """    if (entry.kind === 'existing' && entry.guardian_id > 0) {\n      ids.push(entry.guardian_id);\n    }""",
    """    if (entry.kind === 'existing' && typeof entry.guardian_id === 'number' && entry.guardian_id > 0) {\n      ids.push(entry.guardian_id);\n    }""",
)
append_once(
    "src/features/admin/students/utils/student-create-additional-guardians.ts",
    "export function entryFromLinkedExistingPerson(",
    """export function entryFromLinkedExistingPerson(\n  entryKey: string,\n  person: Pick<import('@/types/student-360').PersonSearchResult, 'guardian_id' | 'person_id' | 'partner_id'>,\n  displayName: string,\n  relationshipType: RelationshipType,\n  phone?: string,\n  email?: string,\n): StudentCreateGuardianEntry {\n  const guardianId =\n    typeof person.guardian_id === 'number' && person.guardian_id > 0\n      ? person.guardian_id\n      : null;\n  const personId =\n    typeof person.person_id === 'number' && person.person_id > 0\n      ? person.person_id\n      : person.partner_id;\n  return {\n    kind: 'existing',\n    entryKey,\n    ...(guardianId != null ? { guardian_id: guardianId } : {}),\n    ...(typeof personId === 'number' && personId > 0 ? { person_id: personId } : {}),\n    displayName,\n    relationship_type: relationshipType,\n    is_primary_contact: false,\n    phone,\n    email,\n  };\n}""",
)

# 8) UI considers an existing Person selection linked even before school.parent exists.
replace_once(
    "src/features/admin/students/components/student-create-guardian-source-panel.tsx",
    """  const isLinked = isExistingMode && linkedGuardianId != null;""",
    """  const isLinked = isExistingMode && (linkedGuardianId != null || linkedGuardianPerson != null);""",
)
replace_once(
    "src/features/admin/students/components/student-create-billing-step.tsx",
    """  const linkedExisting =\n    billingState.guardianSourceMode === 'existing' && billingState.linkedGuardianId != null;""",
    """  const linkedExisting =\n    billingState.guardianSourceMode === 'existing' &&\n    (billingState.linkedGuardianId != null || billingState.linkedGuardianPersonId != null);""",
)
replace_once(
    "src/features/admin/students/components/student-create-additional-guardian-card.tsx",
    """  const isExistingLinked = entry.kind === 'existing' && entry.guardian_id > 0;""",
    """  const isExistingLinked =\n    entry.kind === 'existing' &&\n    ((typeof entry.guardian_id === 'number' && entry.guardian_id > 0) ||\n      (typeof entry.person_id === 'number' && entry.person_id > 0));""",
)

# 9) Wizard keeps both identity spaces explicit.
replace_once(
    "src/features/admin/students/components/student-create-wizard.tsx",
    """  derivePrimaryStudentCreateGuardianEntry,\n  resolvePersonSchoolParentId,""",
    """  derivePrimaryStudentCreateGuardianEntry,\n  resolvePersonPartnerId,\n  resolvePersonSchoolParentId,""",
)
replace_once(
    "src/features/admin/students/components/student-create-wizard.tsx",
    """  createEmptyAdditionalGuardianEntry,\n  entryFromLinkedExistingGuardian,\n  isCompleteStudentCreateGuardianEntry,""",
    """  createEmptyAdditionalGuardianEntry,\n  entryFromLinkedExistingPerson,\n  isCompleteStudentCreateGuardianEntry,""",
)
replace_once(
    "src/features/admin/students/components/student-create-wizard.tsx",
    """      guardianSourceMode: 'existing',\n      linkedGuardianId: selection.guardianId,\n      billingGuardianEntryKey: `existing-${selection.guardianId}`,""",
    """      guardianSourceMode: 'existing',\n      linkedGuardianId: selection.guardianId,\n      linkedGuardianPersonId: null,\n      billingGuardianEntryKey: `existing-${selection.guardianId}`,""",
)
replace_once(
    "src/features/admin/students/components/student-create-wizard.tsx",
    """        prev.linkedGuardianId != null || prev.billingGuardianEntryKey != null\n          ? { ...prev, linkedGuardianId: null, billingGuardianEntryKey: null }""",
    """        prev.linkedGuardianId != null || prev.linkedGuardianPersonId != null || prev.billingGuardianEntryKey != null\n          ? { ...prev, linkedGuardianId: null, linkedGuardianPersonId: null, billingGuardianEntryKey: null }""",
)
replace_once(
    "src/features/admin/students/components/student-create-wizard.tsx",
    """  function handleLinkExistingGuardian(person: PersonSearchResult) {\n    const guardianId = resolvePersonSchoolParentId(person);\n    if (guardianId == null) {\n      toast.error(t('admin.student360.create.billingResponsibility.errors.billingGuardianNotLinked'));\n      return;\n    }\n    if (guardianIdAlreadyUsedInWizard(guardianId)) {\n      toast.error(t('admin.student360.create.billingResponsibility.errors.duplicateGuardianInWizard'));\n      return;\n    }\n    skipGuardianLinkClearRef.current = true;\n    setBillingState((prev) => ({\n      ...prev,\n      guardianSourceMode: 'existing',\n      linkedGuardianId: guardianId,\n      billingGuardianEntryKey: `existing-${guardianId}`,\n    }));\n    setLinkedGuardianPerson(person);""",
    """  function handleLinkExistingGuardian(person: PersonSearchResult) {\n    const guardianId = resolvePersonSchoolParentId(person);\n    const personId = resolvePersonPartnerId(person);\n    if (guardianId == null && personId == null) {\n      toast.error(t('admin.student360.create.billingResponsibility.errors.billingGuardianNotLinked'));\n      return;\n    }\n    if (guardianId != null && guardianIdAlreadyUsedInWizard(guardianId)) {\n      toast.error(t('admin.student360.create.billingResponsibility.errors.duplicateGuardianInWizard'));\n      return;\n    }\n    const entryKey = guardianId != null ? `existing-${guardianId}` : `person-${personId}`;\n    skipGuardianLinkClearRef.current = true;\n    setBillingState((prev) => ({\n      ...prev,\n      guardianSourceMode: 'existing',\n      linkedGuardianId: guardianId,\n      linkedGuardianPersonId: personId,\n      billingGuardianEntryKey: entryKey,\n    }));\n    setLinkedGuardianPerson(person);""",
)
# Three primary-state reset sites use the same small block after distinct context changes.
text_path = Path("src/features/admin/students/components/student-create-wizard.tsx")
text = text_path.read_text()
old = """      linkedGuardianId: null,\n      billingGuardianEntryKey: null,"""
count = text.count(old)
if count < 3:
    raise SystemExit(f"wizard: expected at least 3 primary reset blocks, found {count}")
# The first three are the primary guardian clear/source/RBAC-reset paths; later error reset is also safe.
text = text.replace(old, """      linkedGuardianId: null,\n      linkedGuardianPersonId: null,\n      billingGuardianEntryKey: null,""")
text_path.write_text(text)

replace_once(
    "src/features/admin/students/components/student-create-wizard.tsx",
    """  function handleLinkAdditionalGuardian(entryKey: string, person: PersonSearchResult) {\n    const guardianId = resolvePersonSchoolParentId(person);\n    if (guardianId == null) {\n      toast.error(t('admin.student360.create.billingResponsibility.errors.billingGuardianNotLinked'));\n      return;\n    }\n    if (guardianIdAlreadyUsedInWizard(guardianId, entryKey)) {\n      toast.error(t('admin.student360.create.billingResponsibility.errors.duplicateGuardianInWizard'));\n      return;\n    }""",
    """  function handleLinkAdditionalGuardian(entryKey: string, person: PersonSearchResult) {\n    const guardianId = resolvePersonSchoolParentId(person);\n    const personId = resolvePersonPartnerId(person);\n    if (guardianId == null && personId == null) {\n      toast.error(t('admin.student360.create.billingResponsibility.errors.billingGuardianNotLinked'));\n      return;\n    }\n    if (guardianId != null && guardianIdAlreadyUsedInWizard(guardianId, entryKey)) {\n      toast.error(t('admin.student360.create.billingResponsibility.errors.duplicateGuardianInWizard'));\n      return;\n    }""",
)
replace_once(
    "src/features/admin/students/components/student-create-wizard.tsx",
    """            ? entryFromLinkedExistingGuardian(\n                entryKey,\n                guardianId,\n                person.name,""",
    """            ? entryFromLinkedExistingPerson(\n                entryKey,\n                person,\n                person.name,""",
)
replace_once(
    "src/features/admin/students/components/student-create-wizard.tsx",
    """          admissionSelectionRequired={\n            Boolean(admissionBanner?.guardianSelection.selectionRequired) &&\n            billingState.linkedGuardianId == null\n          }""",
    """          admissionSelectionRequired={\n            Boolean(admissionBanner?.guardianSelection.selectionRequired) &&\n            billingState.linkedGuardianId == null &&\n            billingState.linkedGuardianPersonId == null\n          }""",
)

# 10) Focused regression tests for the incident contract.
test_path = Path("src/features/admin/students/utils/existing-person-guardian-contract.test.ts")
if test_path.exists():
    raise SystemExit(f"{test_path}: already exists")
test_path.write_text("""import { describe, expect, it } from 'vitest';\nimport { normalizePersonSearchResult } from './normalize-person-search';\nimport {\n  applyStudentCreateGuardianAtomicContractToPayload,\n  resolvePersonPartnerId,\n  resolvePersonSchoolParentId,\n} from './student-create-guardian-payload';\nimport { resolveGuardianAccountPresentation } from './resolve-guardian-account-presentation';\nimport { defaultStudentCreateBillingFormState } from './student-create-billing-responsibility';\nimport { buildStudentCreatePayload, defaultStudentProfileFormState } from './student-profile';\n\nfunction profile() {\n  return {\n    ...defaultStudentProfileFormState(null),\n    emergencyContactName: 'Existing Person',\n    emergencyPhone: '0612345678',\n    emergencyRelationship: 'father',\n  };\n}\n\ndescribe('existing person guardian contract', () => {\n  it('keeps generic id in the person space when guardian profile is absent', () => {\n    const result = normalizePersonSearchResult({\n      id: 166,\n      partner_id: 166,\n      person_id: 166,\n      guardian_id: null,\n      name: 'Mohamed',\n      active: true,\n      can_link_as_guardian: true,\n      has_user_account: true,\n      user_id: 30,\n    });\n\n    expect(result).not.toBeNull();\n    expect(result?.person_id).toBe(166);\n    expect(result?.guardian_id).toBeNull();\n    expect(result?.id).toBe(166);\n    expect(result?.has_user_account).toBe(true);\n    expect(resolvePersonSchoolParentId(result!)).toBeNull();\n    expect(resolvePersonPartnerId(result!)).toBe(166);\n  });\n\n  it('sends person_id and lets backend resolve billing guardian for an existing person', () => {\n    const state = profile();\n    const payload = applyStudentCreateGuardianAtomicContractToPayload(\n      buildStudentCreatePayload(state),\n      state,\n      {\n        ...defaultStudentCreateBillingFormState(),\n        guardianSourceMode: 'existing',\n        responsibilitySelection: 'guardian',\n        linkedGuardianId: null,\n        linkedGuardianPersonId: 166,\n        billingGuardianEntryKey: 'person-166',\n      },\n    );\n\n    expect(payload.guardian_relationships).toEqual([\n      expect.objectContaining({\n        person_id: 166,\n        is_financial_responsible: true,\n      }),\n    ]);\n    expect(payload.guardian_relationships?.[0]).not.toHaveProperty('guardian_id');\n    expect(payload.billing_responsibility).toEqual({ mode: 'guardian' });\n    expect(payload.billing_responsibility).not.toHaveProperty('billing_guardian_id');\n  });\n\n  it('keeps a real guardian_id separate from person_id even when numbers differ', () => {\n    const result = normalizePersonSearchResult({\n      id: 29961,\n      partner_id: 166,\n      person_id: 166,\n      guardian_id: 29961,\n      name: 'Mohamed',\n      active: true,\n      can_link_as_guardian: true,\n      has_user_account: true,\n      user_id: 30,\n    });\n\n    expect(result?.person_id).toBe(166);\n    expect(result?.guardian_id).toBe(29961);\n    expect(resolvePersonSchoolParentId(result!)).toBe(29961);\n    expect(resolvePersonPartnerId(result!)).toBe(166);\n  });\n\n  it('does not show no-account when person-level evidence proves an existing user', () => {\n    const presentation = resolveGuardianAccountPresentation({\n      code: null,\n      user_id: 30,\n      has_user_account: true,\n      account: {\n        has_user_account: false,\n        status: 'no_account',\n      },\n    });\n\n    expect(presentation.status).toBe('active');\n    expect(presentation.statusLabelKey).toBe('admin.guardianAccount.status.active');\n  });\n});\n""")

print("existing-person guardian contract transformations applied")
