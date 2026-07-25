import type { LevelCycleOption, LevelOptionsPayload, ReferenceLevelOption } from '@/types/academic-levels';
import {
  REFERENCE_SUBJECT_CATEGORIES,
  type ReferenceSubjectCategory,
  type ReferenceSubjectCreateRequest,
} from '@/types/reference-subjects';

export type ReferenceSubjectDefaultStatus = 'unspecified' | 'mandatory' | 'optional';

export type ReferenceSubjectCreateFormState = {
  name: string;
  code: string;
  cycleId: number | '';
  levelIds: number[];
  subjectCategory: ReferenceSubjectCategory;
  defaultStatus: ReferenceSubjectDefaultStatus;
  weeklySessionsDefault: string;
  externalReferenceCode: string;
  sourceNote: string;
};

export type ReferenceSubjectFormField =
  | 'name'
  | 'code'
  | 'cycle'
  | 'levels'
  | 'category'
  | 'weeklySessions'
  | 'form';

export type ReferenceSubjectFormValidation =
  | { ok: true; payload: ReferenceSubjectCreateRequest }
  | { ok: false; field: ReferenceSubjectFormField; messageKey: string };

export function emptyReferenceSubjectCreateFormState(): ReferenceSubjectCreateFormState {
  return {
    name: '',
    code: '',
    cycleId: '',
    levelIds: [],
    subjectCategory: 'other',
    defaultStatus: 'unspecified',
    weeklySessionsDefault: '0',
    externalReferenceCode: '',
    sourceNote: '',
  };
}

export function isReferenceSubjectCategory(value: string): value is ReferenceSubjectCategory {
  return (REFERENCE_SUBJECT_CATEGORIES as readonly string[]).includes(value);
}

export function mapDefaultStatusFlags(status: ReferenceSubjectDefaultStatus): {
  is_mandatory_default: boolean;
  is_optional_default: boolean;
} {
  switch (status) {
    case 'mandatory':
      return { is_mandatory_default: true, is_optional_default: false };
    case 'optional':
      return { is_mandatory_default: false, is_optional_default: true };
    default:
      return { is_mandatory_default: false, is_optional_default: false };
  }
}

export function filterReferenceLevelsForCycle(
  levels: ReferenceLevelOption[],
  cycleId: number | '',
): ReferenceLevelOption[] {
  if (cycleId === '' || !Number.isFinite(cycleId) || cycleId <= 0) return [];
  return levels.filter((level) => level.cycle?.id === cycleId);
}

export function pruneLevelIdsForCycle(
  levelIds: number[],
  levels: ReferenceLevelOption[],
  cycleId: number | '',
): number[] {
  const allowed = new Set(filterReferenceLevelsForCycle(levels, cycleId).map((l) => l.id));
  return levelIds.filter((id) => allowed.has(id));
}

export function optionalTrimToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function buildReferenceSubjectCreatePayload(
  state: ReferenceSubjectCreateFormState,
  options: Pick<LevelOptionsPayload, 'reference_levels'> | null | undefined,
): ReferenceSubjectFormValidation {
  const name = state.name.trim();
  if (!name) {
    return { ok: false, field: 'name', messageKey: 'errors.validationFailed' };
  }

  const code = state.code.trim();
  if (!code) {
    return { ok: false, field: 'code', messageKey: 'errors.validationFailed' };
  }

  if (state.cycleId === '' || !Number.isInteger(state.cycleId) || state.cycleId <= 0) {
    return { ok: false, field: 'cycle', messageKey: 'errors.validationFailed' };
  }

  if (!isReferenceSubjectCategory(state.subjectCategory)) {
    return { ok: false, field: 'category', messageKey: 'errors.validationFailed' };
  }

  const referenceLevels = options?.reference_levels ?? [];
  const allowedLevels = filterReferenceLevelsForCycle(referenceLevels, state.cycleId);
  const allowedIds = new Set(allowedLevels.map((l) => l.id));
  const levelIds = [...new Set(state.levelIds.filter((id) => Number.isInteger(id) && id > 0))];

  if (!levelIds.length) {
    return {
      ok: false,
      field: 'levels',
      messageKey: 'admin.referenceSubjects.errors.levelsRequired',
    };
  }

  if (levelIds.some((id) => !allowedIds.has(id))) {
    return {
      ok: false,
      field: 'levels',
      messageKey: 'admin.referenceSubjects.errors.cycleLevelMismatch',
    };
  }

  const weeklyRaw = state.weeklySessionsDefault.trim();
  const weekly = weeklyRaw === '' ? 0 : Number(weeklyRaw);
  if (!Number.isInteger(weekly) || weekly < 0) {
    return {
      ok: false,
      field: 'weeklySessions',
      messageKey: 'admin.referenceSubjects.errors.invalidWeeklySessions',
    };
  }

  const flags = mapDefaultStatusFlags(state.defaultStatus);

  const payload: ReferenceSubjectCreateRequest = {
    name,
    code,
    cycle_id: state.cycleId,
    level_ids: levelIds,
    subject_category: state.subjectCategory,
    is_mandatory_default: flags.is_mandatory_default,
    is_optional_default: flags.is_optional_default,
    weekly_sessions_default: weekly,
    external_reference_code: optionalTrimToNull(state.externalReferenceCode),
    source_note: optionalTrimToNull(state.sourceNote),
    active: true,
  };

  return { ok: true, payload };
}

export function sortCycles(cycles: LevelCycleOption[]): LevelCycleOption[] {
  return [...cycles].sort(
    (a, b) =>
      (a.sequence ?? 0) - (b.sequence ?? 0) ||
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
  );
}

export function sortReferenceLevels(levels: ReferenceLevelOption[]): ReferenceLevelOption[] {
  return [...levels].sort(
    (a, b) =>
      (a.sequence ?? 0) - (b.sequence ?? 0) ||
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
  );
}
