import type { ReferenceSubjectOption, SubjectOptionsPayload } from '@/types/academic-subjects';
import { sortReferenceSubjects } from './subject-options';

/** Operational school.subject option for class create/edit. */
export type ClassLevelSubjectOption = {
  id: number;
  name: string;
  code: string;
  refSubjectId: number;
};

export type ClassLegacySubject = {
  id: number;
  name: string;
  code?: string | null;
};

function warnDuplicateOperationalId(id: number): void {
  if (process.env.NODE_ENV !== 'production') {
    // Developer signal only — do not surface to end users.
    console.warn(
      `[class-level-subjects] duplicate operational subject id ${id} in options payload; keeping first row`,
    );
  }
}

/**
 * Build checkbox options from level subject options:
 * active + enabled reference rows that already have an operational school_subject_id.
 * Dedupes by operational id (not by Arabic name).
 */
export function extractLevelEnabledOperationalSubjects(
  payload: SubjectOptionsPayload | null | undefined,
): ClassLevelSubjectOption[] {
  if (!payload) return [];

  const byOperationalId = new Map<number, ClassLevelSubjectOption>();
  for (const ref of sortReferenceSubjects(payload.reference_subjects)) {
    if (!isEnabledOperationalReference(ref)) continue;
    const operationalId = Number(ref.school_subject_id);
    if (byOperationalId.has(operationalId)) {
      warnDuplicateOperationalId(operationalId);
      continue;
    }
    byOperationalId.set(operationalId, {
      id: operationalId,
      name: (ref.display_name || ref.name || ref.code).trim() || ref.code,
      code: ref.code,
      refSubjectId: ref.id,
    });
  }
  return [...byOperationalId.values()];
}

export function isEnabledOperationalReference(ref: ReferenceSubjectOption): boolean {
  if (!ref.active || !ref.enabled) return false;
  const opId = ref.school_subject_id;
  return typeof opId === 'number' && Number.isInteger(opId) && opId > 0;
}

/** Partition current selection into allowed options vs legacy links. */
export function partitionClassSubjectSelection(
  selectedIds: number[],
  options: ClassLevelSubjectOption[],
  legacyCatalog: ClassLegacySubject[] = [],
): {
  allowedIds: number[];
  legacy: ClassLegacySubject[];
} {
  const allowedSet = new Set(options.map((o) => o.id));
  const legacyById = new Map(legacyCatalog.map((s) => [s.id, s]));
  const allowedIds: number[] = [];
  const legacy: ClassLegacySubject[] = [];
  const seen = new Set<number>();

  for (const id of selectedIds) {
    if (!Number.isInteger(id) || id <= 0 || seen.has(id)) continue;
    seen.add(id);
    if (allowedSet.has(id)) {
      allowedIds.push(id);
      continue;
    }
    const known = legacyById.get(id);
    legacy.push(known ?? { id, name: `#${id}` });
  }

  return { allowedIds, legacy };
}

/**
 * IDs safe to persist when the user touched subjects:
 * selected allowed operational IDs + still-selected legacy IDs.
 * Drops IDs that are neither allowed nor retained legacy.
 */
export function resolveClassSubjectIdsForSave(
  selectedIds: number[],
  options: ClassLevelSubjectOption[],
  initialLegacyIds: number[],
): number[] {
  const allowed = new Set(options.map((o) => o.id));
  const legacy = new Set(initialLegacyIds);
  const out: number[] = [];
  const seen = new Set<number>();
  for (const id of selectedIds) {
    if (!Number.isInteger(id) || id <= 0 || seen.has(id)) continue;
    if (!allowed.has(id) && !legacy.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

/** New selections that are incompatible with the newly loaded level options. */
export function incompatibleNewSubjectIds(
  selectedIds: number[],
  options: ClassLevelSubjectOption[],
  initialSubjectIds: number[],
): number[] {
  const allowed = new Set(options.map((o) => o.id));
  const initial = new Set(initialSubjectIds);
  return selectedIds.filter(
    (id) => Number.isInteger(id) && id > 0 && !allowed.has(id) && !initial.has(id),
  );
}

export function dedupeOperationalSubjectOptions(
  options: ClassLevelSubjectOption[],
): ClassLevelSubjectOption[] {
  const map = new Map<number, ClassLevelSubjectOption>();
  for (const option of options) {
    if (!Number.isInteger(option.id) || option.id <= 0) continue;
    if (map.has(option.id)) {
      warnDuplicateOperationalId(option.id);
      continue;
    }
    map.set(option.id, option);
  }
  return [...map.values()];
}
