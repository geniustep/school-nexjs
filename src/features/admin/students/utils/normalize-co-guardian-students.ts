import type {
  CoGuardianCandidate,
  CoGuardianGuardian,
  CoGuardianOtherStudent,
  CoGuardianStudentsData,
} from '@/types/student-co-guardian';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function readNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return null;
}

function readBool(value: unknown): boolean {
  return value === true;
}

function readNumberList(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  const out: number[] = [];
  for (const item of value) {
    const n = readNumber(item);
    if (n != null && !out.includes(n)) out.push(n);
  }
  return out;
}

function readStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => readString(item))
    .filter((item): item is string => item != null);
}

function normalizeOtherStudent(raw: unknown): CoGuardianOtherStudent | null {
  const record = asRecord(raw);
  if (!record) return null;
  const studentId = readNumber(record.student_id);
  if (studentId == null) return null;
  return {
    student_id: studentId,
    display_name: readString(record.display_name),
    level_name: readString(record.level_name),
    class_name: readString(record.class_name),
    status: readString(record.status),
    relationship_to_guardian: readString(record.relationship_to_guardian),
  };
}

function normalizeGuardian(raw: unknown): CoGuardianGuardian | null {
  const record = asRecord(raw);
  if (!record) return null;
  const guardianId = readNumber(record.guardian_id);
  if (guardianId == null) return null;
  const otherStudents = Array.isArray(record.other_students)
    ? record.other_students
        .map(normalizeOtherStudent)
        .filter((item): item is CoGuardianOtherStudent => item != null)
    : [];
  return {
    guardian_id: guardianId,
    guardian_name: readString(record.guardian_name),
    relationship: readString(record.relationship),
    is_primary: readBool(record.is_primary),
    other_students_count: readNumber(record.other_students_count) ?? otherStudents.length,
    other_students: otherStudents,
  };
}

function normalizeCandidate(
  raw: unknown,
  guardianNameById: Map<number, string>,
): CoGuardianCandidate | null {
  const record = asRecord(raw);
  if (!record) return null;
  const studentId = readNumber(record.student_id);
  if (studentId == null) return null;
  const sharedGuardianIds = readNumberList(record.shared_guardian_ids);
  const sharedGuardianNames = sharedGuardianIds
    .map((id) => guardianNameById.get(id))
    .filter((name): name is string => !!name);
  return {
    student_id: studentId,
    display_name: readString(record.display_name),
    level_name: readString(record.level_name),
    class_name: readString(record.class_name),
    status: readString(record.status),
    shared_guardian_ids: sharedGuardianIds,
    shared_guardian_names: sharedGuardianNames,
    evidence: readStringList(record.evidence),
    is_confirmed_sibling: readBool(record.is_confirmed_sibling),
  };
}

/** Merge duplicate candidates (same student_id), unioning shared guardians and evidence. */
function dedupeCandidates(candidates: CoGuardianCandidate[]): CoGuardianCandidate[] {
  const byId = new Map<number, CoGuardianCandidate>();
  for (const candidate of candidates) {
    const existing = byId.get(candidate.student_id);
    if (!existing) {
      byId.set(candidate.student_id, { ...candidate });
      continue;
    }
    existing.shared_guardian_ids = Array.from(
      new Set([...existing.shared_guardian_ids, ...candidate.shared_guardian_ids]),
    );
    existing.shared_guardian_names = Array.from(
      new Set([...existing.shared_guardian_names, ...candidate.shared_guardian_names]),
    );
    existing.evidence = Array.from(new Set([...existing.evidence, ...candidate.evidence]));
    existing.is_confirmed_sibling =
      existing.is_confirmed_sibling || candidate.is_confirmed_sibling;
    existing.display_name = existing.display_name ?? candidate.display_name;
    existing.level_name = existing.level_name ?? candidate.level_name;
    existing.class_name = existing.class_name ?? candidate.class_name;
    existing.status = existing.status ?? candidate.status;
  }
  return Array.from(byId.values());
}

/** Normalize GET /admin/students/{id}/co-guardian-students — tolerant of partial payloads. */
export function normalizeCoGuardianStudentsResponse(
  data: unknown,
): CoGuardianStudentsData | null {
  const record = asRecord(data);
  if (!record) return null;

  const guardians = Array.isArray(record.guardians)
    ? record.guardians
        .map(normalizeGuardian)
        .filter((item): item is CoGuardianGuardian => item != null)
    : [];

  const guardianNameById = new Map<number, string>();
  for (const guardian of guardians) {
    if (guardian.guardian_name) guardianNameById.set(guardian.guardian_id, guardian.guardian_name);
  }

  const rawCandidates = Array.isArray(record.candidates)
    ? record.candidates
        .map((item) => normalizeCandidate(item, guardianNameById))
        .filter((item): item is CoGuardianCandidate => item != null)
    : [];
  const candidates = dedupeCandidates(rawCandidates);

  const summaryRecord = asRecord(record.summary);
  const guardianCount = readNumber(summaryRecord?.guardian_count) ?? guardians.length;
  const candidateCount = readNumber(summaryRecord?.candidate_count) ?? candidates.length;

  return {
    student_id: readNumber(record.student_id),
    school_id: readNumber(record.school_id),
    guardians,
    candidates,
    summary: {
      guardian_count: guardianCount,
      candidate_count: candidateCount,
    },
  };
}
