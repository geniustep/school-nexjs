import type { SubjectOptionsPayload } from '@/types/academic-subjects';
import type { Level, Subject } from '@/types/class';
import {
  SUBJECT_LEVEL_ENABLEMENT_WRITE_AVAILABLE,
  type SubjectEnabledLevelSummary,
  type SubjectLevelEnablementMatrix,
  type SubjectLevelEnablementRow,
  type SubjectEnablementSource,
} from '@/types/subject-enablement';
import { sortReferenceSubjects } from '@/features/admin/academic-setup/utils/subject-options';

function isOperationalActive(subject: Subject): boolean {
  return subject.active !== false;
}

function warnDuplicate(id: number): void {
  if (process.env.NODE_ENV !== 'production') {
    console.warn(`[subject-enablement] duplicate operational subject id ${id}; keeping first`);
  }
}

/**
 * Build a level enablement matrix from operational school subjects + options payload.
 * Options contribute enabled status (school_subject_id); catalog ref-only rows never
 * appear as matrix options.
 */
export function buildLevelEnablementMatrix(
  level: Pick<Level, 'id' | 'name' | 'code'>,
  operationalSubjects: Subject[],
  options: SubjectOptionsPayload | null | undefined,
): SubjectLevelEnablementMatrix {
  const enabledByOpId = new Map<
    number,
    { refSubjectId: number; source: SubjectEnablementSource; name: string; code: string }
  >();

  if (options?.reference_subjects?.length) {
    for (const ref of sortReferenceSubjects(options.reference_subjects)) {
      if (!ref.active || !ref.enabled) continue;
      const opId = Number(ref.school_subject_id);
      if (!Number.isInteger(opId) || opId <= 0) continue;
      if (enabledByOpId.has(opId)) {
        warnDuplicate(opId);
        continue;
      }
      enabledByOpId.set(opId, {
        refSubjectId: ref.id,
        source: ref.source === 'track' ? 'track' : 'level',
        name: (ref.display_name || ref.name || ref.code).trim() || ref.code,
        code: ref.code,
      });
    }
  }

  const byId = new Map<number, SubjectLevelEnablementRow>();
  for (const subject of operationalSubjects) {
    if (!isOperationalActive(subject)) continue;
    if (!Number.isInteger(subject.id) || subject.id <= 0) continue;
    if (byId.has(subject.id)) {
      warnDuplicate(subject.id);
      continue;
    }
    const enabledMeta = enabledByOpId.get(subject.id);
    byId.set(subject.id, {
      operationalSubjectId: subject.id,
      name: (subject.name || enabledMeta?.name || subject.code || `#${subject.id}`).trim(),
      code: (subject.code || enabledMeta?.code || '').trim(),
      status: enabledMeta ? 'enabled' : 'not_enabled',
      source: enabledMeta?.source ?? 'unknown',
      refSubjectId: enabledMeta?.refSubjectId ?? subject.ref_subject_id ?? null,
      active: true,
    });
  }

  const rows = [...byId.values()].sort(
    (a, b) => a.name.localeCompare(b.name, 'ar') || a.code.localeCompare(b.code),
  );
  const enabled = rows.filter((r) => r.status === 'enabled').length;

  return {
    levelId: level.id,
    levelName: level.name,
    levelCode: level.code ?? '',
    rows,
    counts: {
      operationalActive: rows.length,
      enabled,
      notEnabled: rows.length - enabled,
    },
    writeAvailable: SUBJECT_LEVEL_ENABLEMENT_WRITE_AVAILABLE,
  };
}

/** Summaries for /admin/subjects cards from subject.level_ids (read-only hint). */
export function buildSubjectEnabledLevelSummaries(
  subjects: Subject[],
  levels: Pick<Level, 'id' | 'code' | 'name'>[],
): Map<number, SubjectEnabledLevelSummary> {
  const levelById = new Map(levels.map((l) => [l.id, l]));
  const out = new Map<number, SubjectEnabledLevelSummary>();

  for (const subject of subjects) {
    if (!Number.isInteger(subject.id) || subject.id <= 0) continue;
    const rawIds = Array.isArray(subject.level_ids)
      ? subject.level_ids
      : subject.level_id != null
        ? [subject.level_id]
        : [];
    const enabledLevelIds = [
      ...new Set(
        rawIds.filter((id): id is number => typeof id === 'number' && Number.isInteger(id) && id > 0),
      ),
    ];
    const enabledLevelCodes = enabledLevelIds
      .map((id) => levelById.get(id)?.code || levelById.get(id)?.name || String(id))
      .filter(Boolean);

    out.set(subject.id, {
      operationalSubjectId: subject.id,
      enabledLevelIds,
      enabledLevelCodes,
      enabledCount: enabledLevelIds.length,
    });
  }

  return out;
}

export function filterEnablementRows(
  rows: SubjectLevelEnablementRow[],
  search: string,
): SubjectLevelEnablementRow[] {
  const q = search.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((row) => {
    const hay = `${row.name} ${row.code}`.toLowerCase();
    return hay.includes(q);
  });
}

export function matrixContainsCode(
  matrix: SubjectLevelEnablementMatrix,
  code: string,
): boolean {
  const needle = code.trim().toUpperCase();
  return matrix.rows.some((r) => r.code.trim().toUpperCase() === needle);
}
