import type { ApiErrorBody, ApiMeta } from '@/types/api';
import type { Ref } from '@/types/api';
import type { Level, LevelCycle, SchoolClass } from '@/types/class';
import {
  ORPHAN_CYCLE_ID,
  sortCycles,
} from '@/features/admin/academic-setup/utils/group-and-sort-levels';

export interface ClassAcademicYearSource {
  academic_year_id?: number;
  academic_year?: string | Ref | { id: number; name: string } | null;
}

export interface ClassAcademicYearOption {
  id: number;
  name: string;
  is_current?: boolean;
}

export interface ClassFormInput {
  name: string;
  levelId: string;
  trackId: string;
  academicYearId: string;
  capacity: string;
  room: string;
  teacherIds: number[];
  subjectIds: number[];
  /** When false/undefined, subject_ids are omitted so unrelated edits cannot wipe links. */
  subjectsTouched?: boolean;
  creating?: boolean;
}

export function resolveAcademicYearId(cls?: ClassAcademicYearSource): string {
  if (cls?.academic_year_id) return String(cls.academic_year_id);
  const ay = cls?.academic_year;
  if (ay && typeof ay === 'object' && 'id' in ay) return String(ay.id);
  return '';
}

/** Prefer `is_current` when the options contract exposes it; else first entry. */
export function resolveDefaultClassAcademicYearId(
  years: ClassAcademicYearOption[],
): string {
  if (!years.length) return '';
  const current = years.find((y) => y.is_current);
  return String((current ?? years[0]).id);
}

export function collectCyclesFromLevels(levels: Level[]): LevelCycle[] {
  const byId = new Map<number, LevelCycle>();
  let hasOrphan = false;
  for (const level of levels) {
    if (level.cycle?.id != null) {
      byId.set(level.cycle.id, level.cycle);
    } else {
      hasOrphan = true;
    }
  }
  if (hasOrphan) {
    byId.set(ORPHAN_CYCLE_ID, {
      id: ORPHAN_CYCLE_ID,
      code: 'other',
      name: '—',
      sequence: 999_999,
    });
  }
  return sortCycles([...byId.values()]);
}

export function filterLevelsByCycleId(levels: Level[], cycleId: string): Level[] {
  if (!cycleId) return [];
  const id = Number(cycleId);
  if (!Number.isFinite(id)) return [];
  return levels.filter((level) => {
    if (id === ORPHAN_CYCLE_ID) return level.cycle == null || level.cycle.id === ORPHAN_CYCLE_ID;
    return level.cycle?.id === id;
  });
}

export function resolveCycleIdForLevel(level: Level | undefined): string {
  if (!level) return '';
  if (level.cycle?.id != null) return String(level.cycle.id);
  return String(ORPHAN_CYCLE_ID);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Read level.academic_code only — never fall back to level.code or Arabic name. */
export function resolveLevelAcademicCode(
  level: Pick<Level, 'academic_code'> | null | undefined,
): string | null {
  const code = level?.academic_code?.trim();
  return code ? code : null;
}

/**
 * Parse canonical group number from `{academic_code}-{N}`.
 * Rejects legacy names (P1A, 6AP-A, 1-3APG) and non-positive N.
 */
export function parseCanonicalClassGroupNumber(
  className: string,
  academicCode: string,
): number | null {
  const code = academicCode.trim();
  if (!code) return null;
  const match = className.trim().match(new RegExp(`^${escapeRegExp(code)}-(\\d+)$`));
  if (!match) return null;
  const n = Number(match[1]);
  if (!Number.isInteger(n) || n < 1) return null;
  return n;
}

/**
 * Suggest one or more canonical class names: `{academic_code}-{N}`.
 * N is the smallest unused positive integer; gaps are reused.
 * Returns null when academic_code is missing (no legacy fallback).
 */
export function suggestCanonicalClassNames(
  academicCode: string | null | undefined,
  existingNames: string[],
  quantity = 1,
): string[] | null {
  const code = academicCode?.trim();
  if (!code) return null;
  const count = Math.max(1, Math.floor(quantity));
  const taken = new Set<number>();
  for (const name of existingNames) {
    const n = parseCanonicalClassGroupNumber(name, code);
    if (n != null) taken.add(n);
  }

  const results: string[] = [];
  let n = 1;
  while (results.length < count) {
    if (!taken.has(n)) {
      results.push(`${code}-${n}`);
      taken.add(n);
    }
    n += 1;
  }
  return results;
}

export function suggestNextCanonicalClassName(
  academicCode: string | null | undefined,
  existingNames: string[],
): string | null {
  const names = suggestCanonicalClassNames(academicCode, existingNames, 1);
  return names?.[0] ?? null;
}

/** Existing class names in scope: same level (+ academic year when id is known). */
export function existingClassNamesForCanonicalScope(
  classes: Array<
    Pick<SchoolClass, 'name' | 'level'> & { academic_year_id?: number | null }
  > | null | undefined,
  options: { levelId: string | number; academicYearId?: string },
): string[] {
  const levelId = Number(options.levelId);
  if (!Number.isFinite(levelId) || levelId <= 0) return [];
  const yearRaw = options.academicYearId?.trim() ?? '';
  const yearId = yearRaw ? Number(yearRaw) : NaN;
  const filterByYear = Number.isFinite(yearId) && yearId > 0;

  return (classes ?? [])
    .filter((cls) => cls.level?.id === levelId)
    .filter((cls) => {
      if (!filterByYear) return true;
      if (typeof cls.academic_year_id === 'number') {
        return cls.academic_year_id === yearId;
      }
      // Year unknown on row — keep name in pool so we never suggest a likely collision.
      return true;
    })
    .map((cls) => cls.name)
    .filter((name): name is string => typeof name === 'string' && name.trim().length > 0);
}

/** @deprecated Prefer existingClassNamesForCanonicalScope with year when available. */
export function existingClassNamesForLevel(
  classes: SchoolClass[] | null | undefined,
  levelId: string | number,
): string[] {
  return existingClassNamesForCanonicalScope(classes, { levelId });
}

/** Whether auto-suggested name should be replaced after year/level change. */
export function shouldReplaceSuggestedClassName(
  currentName: string,
  previousSuggestion: string,
  nameManuallyEdited: boolean,
): boolean {
  if (!nameManuallyEdited) return true;
  return currentName.trim() === previousSuggestion.trim();
}

/** Whether a classes list response is complete enough to compute next N safely. */
export function isClassesListCompleteForNaming(
  data: unknown[] | null | undefined,
  meta: ApiMeta | null | undefined,
): boolean {
  if (!data) return false;
  const pg = meta?.pagination;
  if (!pg) return true;
  const total = typeof pg.total === 'number' ? pg.total : null;
  if (total != null && data.length < total) return false;
  if (
    typeof pg.page === 'number' &&
    typeof pg.total_pages === 'number' &&
    pg.total_pages > 0 &&
    pg.page < pg.total_pages
  ) {
    return false;
  }
  return true;
}

/** Shared POST body for one class row in individual or batch create. */
export function buildBatchClassCreatePayload(input: {
  name: string;
  levelId: number;
  academicYearId: string;
  subjectIds: number[];
  trackId?: string;
  capacity?: string;
}): Record<string, unknown> {
  return buildClassPayload({
    name: input.name,
    levelId: String(input.levelId),
    trackId: input.trackId ?? '',
    academicYearId: input.academicYearId,
    capacity: input.capacity ?? '',
    room: '',
    teacherIds: [],
    subjectIds: input.subjectIds,
    subjectsTouched: true,
    creating: true,
  });
}

/** Build a POST body accepted by POST /admin/classes and /admin/classes/{id}/update. */
export function buildClassPayload(input: ClassFormInput): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    name: input.name.trim(),
    level_id: Number(input.levelId),
  };

  if (input.trackId.trim()) {
    payload.track_id = Number(input.trackId);
  } else if (!input.creating) {
    payload.track_id = null;
  }

  const year = input.academicYearId.trim();
  if (year) payload.academic_year_id = Number(year);

  if (input.capacity.trim()) payload.capacity = Number(input.capacity);
  if (input.room.trim()) payload.room_number = input.room.trim();

  const teachers = input.teacherIds.filter((id) => Number.isInteger(id) && id > 0);
  if (teachers.length > 0) payload.teacher_ids = teachers;

  if (input.subjectsTouched) {
    // Explicit: [] clears class subject overrides; omission means "leave unchanged".
    payload.subject_ids = input.subjectIds.filter((id) => Number.isInteger(id) && id > 0);
  }

  if (input.creating) payload.active = true;

  return payload;
}

function msgIncludes(message: string, ...needles: string[]): boolean {
  const lower = message.toLowerCase();
  return needles.some((n) => lower.includes(n.toLowerCase()));
}

/** Map class create/update API errors to user-facing messages. */
export function mapClassApiError(
  error: ApiErrorBody,
  t: (key: string) => string,
): string {
  const code = String(error.code ?? '');
  const message = error.message?.trim() ?? '';

  if (code === 'duplicate_record' || code === 'conflict') {
    return t('admin.classDuplicateName');
  }

  if (code === 'permission_denied' || code === 'forbidden') {
    return t('admin.classForbidden');
  }

  if (code === 'validation_error') {
    if (msgIncludes(message, 'level', 'مستوى', 'level_id')) {
      return t('admin.classInvalidLevel');
    }
    if (msgIncludes(message, 'academic year', 'academic_year', 'سنة', 'year')) {
      return t('admin.classInvalidYear');
    }
    if (
      msgIncludes(message, 'teacher', 'subject', 'أستاذ', 'مادة', 'teacher_ids', 'subject_ids')
    ) {
      return t('admin.classInvalidTeachersSubjects');
    }
    if (msgIncludes(message, 'track', 'شعبة', 'track_id', 'class_track', 'track_level')) {
      return t('admin.academicSetup.errors.classTrackMismatch');
    }
    if (message && !msgIncludes(message, '<', 'traceback', 'html')) {
      return message;
    }
    return t('admin.classValidation');
  }

  if (message && !msgIncludes(message, '<', 'traceback', 'html')) {
    return message;
  }

  return t('errors.serverError');
}
