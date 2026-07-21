import type { SubjectOptionsPayload } from '@/types/academic-subjects';
import type { Level, Subject } from '@/types/class';
import {
  isSubjectLevelEnablementWriteAvailable,
  type SubjectEnabledLevelSummary,
  type SubjectEnablementItem,
  type SubjectEnablementMatrixPayload,
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

function writeAvailableFor(canManage: boolean): boolean {
  return isSubjectLevelEnablementWriteAvailable() && canManage;
}

/** Build UI matrix from Odoo 236 GET /admin/subjects/enablement payload. */
export function buildMatrixFromEnablementPayload(
  payload: SubjectEnablementMatrixPayload,
  levelId: number,
): SubjectLevelEnablementMatrix {
  const level =
    payload.levels.find((l) => l.id === levelId) ??
    ({
      id: levelId,
      name: String(levelId),
      code: '',
    } as SubjectEnablementMatrixPayload['levels'][number]);

  const itemsForLevel = payload.items.filter((item) => item.level?.id === levelId);
  const enabledByOpId = new Map<number, SubjectEnablementItem>();
  for (const item of itemsForLevel) {
    const opId = Number(item.operational_subject_id);
    if (!Number.isInteger(opId) || opId <= 0) continue;
    if (enabledByOpId.has(opId)) {
      warnDuplicate(opId);
      continue;
    }
    enabledByOpId.set(opId, item);
  }

  const byId = new Map<number, SubjectLevelEnablementRow>();
  for (const subject of payload.operational_subjects) {
    if (subject.active === false) continue;
    if (!Number.isInteger(subject.id) || subject.id <= 0) continue;
    if (byId.has(subject.id)) {
      warnDuplicate(subject.id);
      continue;
    }
    const item = enabledByOpId.get(subject.id);
    const enabled = item?.enabled === true && item?.is_active !== false;
    byId.set(subject.id, {
      operationalSubjectId: subject.id,
      name: (subject.name || item?.subject?.name || subject.code || `#${subject.id}`).trim(),
      code: (subject.code || item?.subject?.code || '').trim(),
      status: enabled ? 'enabled' : 'not_enabled',
      source: 'level',
      refSubjectId: subject.ref_subject_id ?? item?.subject?.ref_subject_id ?? null,
      active: true,
      enabledRecordId: item?.enabled_record_id ?? null,
      state: item?.state ?? (enabled ? 'enabled' : 'not_enabled'),
      consumerSummary: item?.consumer_summary ?? null,
      allowedActions: item?.allowed_actions ?? null,
    });
  }

  const rows = [...byId.values()].sort(
    (a, b) => a.name.localeCompare(b.name, 'ar') || a.code.localeCompare(b.code),
  );
  const enabled = rows.filter((r) => r.status === 'enabled').length;
  const canManage = payload.permissions?.can_manage === true;
  const canView = payload.permissions?.can_view === true || canManage;

  return {
    levelId: level.id,
    levelName: level.name,
    levelCode: level.code ?? '',
    academicYearId: payload.academic_year?.id ?? null,
    version: payload.version ?? null,
    rows,
    counts: {
      operationalActive: rows.length,
      enabled,
      notEnabled: rows.length - enabled,
    },
    permissions: { canView, canManage },
    writeAvailable: writeAvailableFor(canManage),
  };
}

/**
 * Legacy builder from operational school subjects + options payload.
 * Kept for fallback/tests; write UI prefers `buildMatrixFromEnablementPayload`.
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
    academicYearId: null,
    version: null,
    rows,
    counts: {
      operationalActive: rows.length,
      enabled,
      notEnabled: rows.length - enabled,
    },
    permissions: { canView: true, canManage: false },
    writeAvailable: false,
  };
}

/** Summaries for /admin/subjects cards from subject.level_ids (list hint). */
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

/** Summaries from enablement GET items (preferred when payload available). */
export function buildSubjectEnabledLevelSummariesFromPayload(
  payload: SubjectEnablementMatrixPayload,
  levels: Pick<Level, 'id' | 'code' | 'name'>[],
): Map<number, SubjectEnabledLevelSummary> {
  const levelById = new Map(levels.map((l) => [l.id, l]));
  const bySubject = new Map<number, Set<number>>();

  for (const item of payload.items) {
    if (!item.enabled || item.is_active === false) continue;
    const opId = Number(item.operational_subject_id);
    const levelId = Number(item.level?.id);
    if (!Number.isInteger(opId) || opId <= 0) continue;
    if (!Number.isInteger(levelId) || levelId <= 0) continue;
    if (!bySubject.has(opId)) bySubject.set(opId, new Set());
    bySubject.get(opId)!.add(levelId);
  }

  const out = new Map<number, SubjectEnabledLevelSummary>();
  for (const [opId, levelIds] of bySubject) {
    const enabledLevelIds = [...levelIds];
    const enabledLevelCodes = enabledLevelIds
      .map((id) => levelById.get(id)?.code || levelById.get(id)?.name || String(id))
      .filter(Boolean);
    out.set(opId, {
      operationalSubjectId: opId,
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

/** Labels for summary lists — always include code beside name. */
export function formatSubjectLabel(row: Pick<SubjectLevelEnablementRow, 'name' | 'code'>): string {
  const code = row.code?.trim();
  return code ? `${row.name} (${code})` : row.name;
}
