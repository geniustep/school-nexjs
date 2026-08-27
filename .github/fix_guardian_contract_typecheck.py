from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected exactly one match, found {count}\n--- OLD ---\n{old}")
    p.write_text(text.replace(old, new, 1))


# Provisioning UI: preserve person/user evidence when no school.parent exists yet.
replace_once(
    "src/features/admin/students/components/student-create-guardian-provision-section.tsx",
    """function resolveEntryAccountSource(\n  entry: StudentCreateGuardianEntry,\n  linkedGuardianPerson: PersonSearchResult | null,\n  linkedGuardianPersonsByEntryKey: Record<string, PersonSearchResult>,\n): PersonSearchResult | null {\n  if (entry.kind !== 'existing') return null;\n  const fromMap = linkedGuardianPersonsByEntryKey[entry.entryKey];\n  if (fromMap && entry.guardian_id === fromMap.guardian_id) {\n    return fromMap;\n  }\n  if (linkedGuardianPerson && entry.guardian_id === linkedGuardianPerson.guardian_id) {\n    return linkedGuardianPerson;\n  }\n  return {\n    guardian_id: entry.guardian_id,\n    partner_id: entry.guardian_id,\n    id: entry.guardian_id,\n    name: entry.displayName,\n    has_user_account: false,\n    can_link_as_guardian: true,\n    existing_roles: [],\n    role_labels: [],\n  };\n}""",
    """function resolveEntryAccountSource(\n  entry: StudentCreateGuardianEntry,\n  linkedGuardianPerson: PersonSearchResult | null,\n  linkedGuardianPersonsByEntryKey: Record<string, PersonSearchResult>,\n): PersonSearchResult | null {\n  if (entry.kind !== 'existing') return null;\n  const personId =\n    typeof entry.person_id === 'number' && entry.person_id > 0\n      ? entry.person_id\n      : null;\n  const guardianId =\n    typeof entry.guardian_id === 'number' && entry.guardian_id > 0\n      ? entry.guardian_id\n      : null;\n  const matchesEntry = (person: PersonSearchResult | null | undefined) => {\n    if (!person) return false;\n    if (guardianId != null && person.guardian_id === guardianId) return true;\n    const candidatePersonId = person.person_id ?? person.partner_id;\n    return personId != null && candidatePersonId === personId;\n  };\n  const fromMap = linkedGuardianPersonsByEntryKey[entry.entryKey];\n  if (matchesEntry(fromMap)) return fromMap;\n  if (matchesEntry(linkedGuardianPerson)) return linkedGuardianPerson;\n  const canonicalPersonId = personId ?? guardianId;\n  if (canonicalPersonId == null) return null;\n  return {\n    guardian_id: guardianId,\n    person_id: personId ?? undefined,\n    partner_id: canonicalPersonId,\n    id: guardianId ?? canonicalPersonId,\n    name: entry.displayName,\n    has_user_account: false,\n    can_link_as_guardian: true,\n    existing_roles: [],\n    role_labels: [],\n  };\n}""",
)

# Duplicate tracking only operates in school.parent id space.
replace_once(
    "src/features/admin/students/components/student-create-wizard.tsx",
    """      if (excluded?.kind === 'existing') {\n        used.delete(excluded.guardian_id);\n      }""",
    """      if (\n        excluded?.kind === 'existing' &&\n        typeof excluded.guardian_id === 'number' &&\n        excluded.guardian_id > 0\n      ) {\n        used.delete(excluded.guardian_id);\n      }""",
)

# Family form can preserve either identity selector after a resolved/retry state.
replace_once(
    "src/features/admin/students/utils/family-registration-apply-resolved.ts",
    """      guardianSourceMode: 'existing',\n      linkedGuardianId: primary.guardian_id,\n    };""",
    """      guardianSourceMode: 'existing',\n      linkedGuardianId:\n        typeof primary.guardian_id === 'number' && primary.guardian_id > 0\n          ? primary.guardian_id\n          : null,\n      linkedGuardianPersonId:\n        typeof primary.person_id === 'number' && primary.person_id > 0\n          ? primary.person_id\n          : null,\n    };""",
)
replace_once(
    "src/features/admin/students/utils/family-registration-apply-resolved.ts",
    """      guardianSourceMode: 'new',\n      linkedGuardianId: null,\n    };""",
    """      guardianSourceMode: 'new',\n      linkedGuardianId: null,\n      linkedGuardianPersonId: null,\n    };""",
)

# Family atomic child payload preserves the explicit person selector as well.
replace_once(
    "src/features/admin/students/utils/family-registration-payload.ts",
    """  if (primaryEntry?.kind === 'existing') {\n    billingForChild.guardianSourceMode = 'existing';\n    billingForChild.linkedGuardianId = primaryEntry.guardian_id;""",
    """  if (primaryEntry?.kind === 'existing') {\n    billingForChild.guardianSourceMode = 'existing';\n    billingForChild.linkedGuardianId =\n      typeof primaryEntry.guardian_id === 'number' && primaryEntry.guardian_id > 0\n        ? primaryEntry.guardian_id\n        : null;\n    billingForChild.linkedGuardianPersonId =\n      typeof primaryEntry.person_id === 'number' && primaryEntry.person_id > 0\n        ? primaryEntry.person_id\n        : null;""",
)
replace_once(
    "src/features/admin/students/utils/family-registration-payload.ts",
    """    billingForChild.guardianSourceMode = 'new';\n    billingForChild.linkedGuardianId = null;""",
    """    billingForChild.guardianSourceMode = 'new';\n    billingForChild.linkedGuardianId = null;\n    billingForChild.linkedGuardianPersonId = null;""",
)

# Batch-registration has a different contract and currently accepts guardian_id/new guardian only.
# Fail deterministically rather than coercing a res.partner id into guardian_id.
replace_once(
    "src/features/admin/students/utils/family-registration-batch-payload.ts",
    """    if (entry.kind === 'existing') {\n      out.push({\n        client_guardian_key: key,\n        guardian_id: entry.guardian_id,\n      });\n      continue;\n    }""",
    """    if (entry.kind === 'existing') {\n      if (typeof entry.guardian_id !== 'number' || entry.guardian_id <= 0) {\n        throw new Error('batch_registration_existing_guardian_profile_required');\n      }\n      out.push({\n        client_guardian_key: key,\n        guardian_id: entry.guardian_id,\n      });\n      continue;\n    }""",
)

print('guardian contract typecheck follow-ups applied')
