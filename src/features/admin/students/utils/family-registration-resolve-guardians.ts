import type { StudentCreateGuardianEntry } from '@/types/student-enrollment-finance';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function trim(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function readGuardianId(guardian: Record<string, unknown>): number | null {
  if (typeof guardian.guardian_id === 'number' && guardian.guardian_id > 0) {
    return guardian.guardian_id;
  }
  if (typeof guardian.id === 'number' && guardian.id > 0) {
    return guardian.id;
  }
  return null;
}

function readGuardianName(guardian: Record<string, unknown>): string {
  return (
    trim(guardian.display_name) ||
    trim(guardian.name) ||
    trim(guardian.full_name) ||
    ''
  );
}

export interface ResolvedGuardianIdentity {
  guardianId: number;
  displayName: string;
}

/**
 * Extract school.parent ids from an atomic student-create (or details) response.
 * Used so subsequent siblings reuse existing guardians instead of nesting new ones.
 */
export function extractResolvedGuardiansFromStudentPayload(
  data: unknown,
): ResolvedGuardianIdentity[] {
  const record = asRecord(data);
  if (!record) return [];

  const relationships = Array.isArray(record.guardian_relationships)
    ? record.guardian_relationships
    : Array.isArray(asRecord(record.student)?.guardian_relationships)
      ? (asRecord(record.student)!.guardian_relationships as unknown[])
      : [];

  const out: ResolvedGuardianIdentity[] = [];
  for (const item of relationships) {
    const rel = asRecord(item);
    if (!rel) continue;
    const guardianRaw = asRecord(rel.guardian) ?? rel;
    const guardianId =
      (typeof rel.guardian_id === 'number' && rel.guardian_id > 0
        ? rel.guardian_id
        : null) ?? readGuardianId(guardianRaw);
    if (guardianId == null) continue;
    out.push({
      guardianId,
      displayName: readGuardianName(guardianRaw) || `guardian-${guardianId}`,
    });
  }
  return out;
}

function normalizeName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Convert any `new` guardian entries to `existing` using resolved ids from
 * the first successful create / student details read.
 * Matching prefers display name, then stable order for remaining unresolved.
 */
export function resolveFamilyGuardianEntriesToExisting(
  entries: StudentCreateGuardianEntry[],
  resolved: ResolvedGuardianIdentity[],
): { entries: StudentCreateGuardianEntry[]; unresolvedNewCount: number } {
  if (entries.every((e) => e.kind === 'existing')) {
    return { entries, unresolvedNewCount: 0 };
  }

  const available = [...resolved];
  const next: StudentCreateGuardianEntry[] = [];
  let unresolvedNewCount = 0;

  for (const entry of entries) {
    if (entry.kind === 'existing') {
      next.push(entry);
      continue;
    }

    const nameKey = normalizeName(entry.full_name);
    let matchIndex = available.findIndex(
      (item) => normalizeName(item.displayName) === nameKey,
    );
    if (matchIndex < 0 && available.length === 1 && entries.filter((e) => e.kind === 'new').length === 1) {
      matchIndex = 0;
    }
    if (matchIndex < 0 && available.length > 0) {
      // Ordered fallback only when counts match remaining new slots.
      const remainingNew = entries.length - next.length;
      if (available.length === remainingNew) {
        matchIndex = 0;
      }
    }

    if (matchIndex < 0) {
      unresolvedNewCount += 1;
      next.push(entry);
      continue;
    }

    const [matched] = available.splice(matchIndex, 1);
    next.push({
      kind: 'existing',
      entryKey: entry.entryKey,
      guardian_id: matched.guardianId,
      displayName: matched.displayName || entry.full_name,
      relationship_type: entry.relationship_type,
      is_primary_contact: entry.is_primary_contact,
      phone: entry.phone,
      email: entry.email,
    });
  }

  return { entries: next, unresolvedNewCount };
}

export function countUnresolvedNewGuardians(
  entries: StudentCreateGuardianEntry[],
): number {
  return entries.filter((entry) => entry.kind === 'new').length;
}

export function canSafelyContinueFamilyRegistration(
  entries: StudentCreateGuardianEntry[],
): boolean {
  return countUnresolvedNewGuardians(entries) === 0;
}
