import type { StudentClassOption, StudentCreatePayload } from '@/types/student-360';
import type { StudentCreateGuardianEntry } from '@/types/student-enrollment-finance';
import type {
  BatchChildAcademicInput,
  BatchChildInput,
  BatchGuardianInput,
  BatchRegistrationRequest,
} from '@/types/student-batch-registration';
import {
  FAMILY_REGISTRATION_MAX_CHILDREN,
  type FamilyRegistrationChildState,
  type FamilyRegistrationFormState,
} from './family-registration-state';
import { buildFamilyChildCreatePayload, collectFamilyGuardianEntries } from './family-registration-payload';
import type { FamilyBatchIdempotencyRegistry } from './family-registration-idempotency';
import { buildStudentCreateAcademicBlock } from './student-profile';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function guardianEntryToClientKey(entry: StudentCreateGuardianEntry): string {
  return entry.entryKey;
}

export function buildBatchGuardiansFromEntries(
  entries: StudentCreateGuardianEntry[],
): BatchGuardianInput[] {
  const seen = new Set<string>();
  const out: BatchGuardianInput[] = [];
  for (const entry of entries) {
    const key = guardianEntryToClientKey(entry);
    if (seen.has(key)) continue;
    seen.add(key);
    if (entry.kind === 'existing') {
      if (typeof entry.guardian_id !== 'number' || entry.guardian_id <= 0) {
        throw new Error('batch_registration_existing_guardian_profile_required');
      }
      out.push({
        client_guardian_key: key,
        guardian_id: entry.guardian_id,
      });
      continue;
    }
    out.push({
      client_guardian_key: key,
      guardian: {
        name: entry.full_name,
        ...(entry.phone ? { mobile: entry.phone } : {}),
        ...(entry.email ? { email: entry.email } : {}),
      },
    });
  }
  return out;
}

function stripSchoolIdDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripSchoolIdDeep(item)) as T;
  }
  const record = asRecord(value);
  if (!record) return value;
  const next: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(record)) {
    if (key === 'school_id' || key === 'family_id') continue;
    next[key] = stripSchoolIdDeep(nested);
  }
  return next as T;
}

function resolveBatchAcademic(
  child: FamilyRegistrationChildState,
  atomic: StudentCreatePayload,
  schoolId: number | null,
): BatchChildAcademicInput | undefined {
  if (atomic.academic) {
    return {
      academic_year_id: atomic.academic.academic_year_id,
      level_id: atomic.academic.level_id,
      ...(atomic.academic.class_id != null ? { class_id: atomic.academic.class_id } : {}),
      enrollment_date: atomic.academic.enrollment_date,
    };
  }
  if (schoolId == null) return undefined;
  const block = buildStudentCreateAcademicBlock(child.profile, schoolId, undefined);
  if (!block) return undefined;
  return {
    academic_year_id: block.academic_year_id,
    level_id: block.level_id,
    ...(block.class_id != null ? { class_id: block.class_id } : {}),
    enrollment_date: block.enrollment_date,
  };
}

function mapChildFromAtomicPayload(options: {
  child: FamilyRegistrationChildState;
  clientChildId: string;
  childIdempotencyKey: string;
  atomic: StudentCreatePayload;
  guardianEntries: StudentCreateGuardianEntry[];
  schoolId: number | null;
}): BatchChildInput {
  const {
    child,
    clientChildId,
    childIdempotencyKey,
    atomic,
    guardianEntries,
    schoolId,
  } = options;
  const entryByKey = new Map(guardianEntries.map((e) => [e.entryKey, e]));

  const relationships = (atomic.guardian_relationships ?? []).map((rel, index) => {
    let clientKey: string | undefined;
    if ('guardian_id' in rel && typeof rel.guardian_id === 'number') {
      const match = guardianEntries.find(
        (e) => e.kind === 'existing' && e.guardian_id === rel.guardian_id,
      );
      clientKey = match?.entryKey;
    } else if ('guardian' in rel) {
      const name = rel.guardian.full_name?.trim();
      const match = guardianEntries.find(
        (e) => e.kind === 'new' && e.full_name.trim() === name,
      );
      clientKey = match?.entryKey ?? guardianEntries[index]?.entryKey;
    } else {
      clientKey = guardianEntries[index]?.entryKey;
    }
    if (!clientKey) {
      clientKey = guardianEntries[index]?.entryKey ?? `unknown-${index}`;
    }
    if (!entryByKey.has(clientKey) && guardianEntries[index]) {
      clientKey = guardianEntries[index].entryKey;
    }
    return {
      client_guardian_key: clientKey,
      relationship_type: rel.relationship_type,
      ...(rel.is_primary_contact != null ? { is_primary_contact: rel.is_primary_contact } : {}),
      ...(rel.is_financial_responsible != null
        ? { is_financial_responsible: rel.is_financial_responsible }
        : {}),
      ...(rel.is_emergency_contact != null
        ? { is_emergency_contact: rel.is_emergency_contact }
        : {}),
      ...(rel.receives_notifications != null
        ? { receives_notifications: rel.receives_notifications }
        : {}),
      ...(rel.provision_access === true ? { provision_access: true } : {}),
    };
  });

  const academic = resolveBatchAcademic(child, atomic, schoolId);

  const mapped: BatchChildInput = {
    client_child_id: clientChildId,
    idempotency_key: childIdempotencyKey,
    first_name: atomic.first_name,
    last_name: atomic.last_name,
    ...(atomic.name_ar ? { name_ar: atomic.name_ar } : {}),
    ...(atomic.name_latin ? { name_latin: atomic.name_latin } : {}),
    ...(atomic.code ? { code: atomic.code } : {}),
    ...(atomic.school_number ? { school_number: atomic.school_number } : {}),
    ...(atomic.massar_code ? { massar_code: atomic.massar_code } : {}),
    ...(atomic.gender ? { gender: atomic.gender } : {}),
    ...(atomic.date_of_birth ? { date_of_birth: atomic.date_of_birth } : {}),
    ...(atomic.birth_place ? { birth_place: atomic.birth_place } : {}),
    ...(typeof atomic.nationality_id === 'number'
      ? { nationality_id: atomic.nationality_id }
      : {}),
    ...(academic ? { academic } : {}),
    ...(atomic.enrollment
      ? {
          enrollment: stripSchoolIdDeep(
            atomic.enrollment as unknown as Record<string, unknown>,
          ),
        }
      : {}),
    guardian_relationships: relationships,
    ...(atomic.billing_responsibility
      ? { billing_responsibility: atomic.billing_responsibility }
      : {}),
  };

  if (atomic.finance && typeof atomic.finance === 'object') {
    mapped.finance = stripSchoolIdDeep(
      atomic.finance as unknown as Record<string, unknown>,
    );
  }

  return stripSchoolIdDeep(mapped);
}

export function assertNoForbiddenBatchFields(body: BatchRegistrationRequest): void {
  const serialized = JSON.stringify(body);
  if (/"school_id"\s*:/.test(serialized) || /"family_id"\s*:/.test(serialized)) {
    throw new Error('batch_registration_forbidden_tenant_fields');
  }
}

export function buildFamilyBatchRegistrationRequest(options: {
  form: FamilyRegistrationFormState;
  schoolId: number | null;
  classes?: StudentClassOption[];
  /** When set, only these client_child_id values are included (failed-only retry). */
  onlyClientChildIds?: string[];
  guardianEntries?: StudentCreateGuardianEntry[];
  idempotency: FamilyBatchIdempotencyRegistry;
}): BatchRegistrationRequest {
  const { form, schoolId, classes, onlyClientChildIds, idempotency } = options;
  const allEntries =
    options.guardianEntries && options.guardianEntries.length > 0
      ? options.guardianEntries
      : collectFamilyGuardianEntries(form);

  const targetChildren = form.children.filter((child) =>
    onlyClientChildIds ? onlyClientChildIds.includes(child.localId) : true,
  );

  if (form.children.length > FAMILY_REGISTRATION_MAX_CHILDREN) {
    throw new Error('family_registration_max_children_exceeded');
  }
  if (targetChildren.length > FAMILY_REGISTRATION_MAX_CHILDREN) {
    throw new Error('family_registration_max_children_exceeded');
  }

  idempotency.pruneChildren(form.children.map((c) => c.localId));
  const batchKey = idempotency.ensureBatchKey();

  const childrenPayload: BatchChildInput[] = [];
  const usedGuardianKeys = new Set<string>();

  for (const child of targetChildren) {
    const atomic = buildFamilyChildCreatePayload({
      child,
      guardianHost: form.guardianHost,
      billing: form.billing,
      guardianEntries: allEntries,
      schoolId,
      classes,
    });
    const mapped = mapChildFromAtomicPayload({
      child,
      clientChildId: child.localId,
      childIdempotencyKey: idempotency.ensureChildKey(child.localId),
      atomic,
      guardianEntries: allEntries,
      schoolId,
    });
    for (const rel of mapped.guardian_relationships) {
      usedGuardianKeys.add(rel.client_guardian_key);
    }
    childrenPayload.push(mapped);
  }

  const guardians = buildBatchGuardiansFromEntries(allEntries).filter((g) =>
    usedGuardianKeys.has(g.client_guardian_key),
  );

  const request: BatchRegistrationRequest = {
    idempotency_key: batchKey,
    guardians,
    children: childrenPayload,
  };
  assertNoForbiddenBatchFields(request);
  return request;
}
