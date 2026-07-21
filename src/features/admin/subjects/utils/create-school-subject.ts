import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { ApiErrorBody } from '@/types/api';
import type { Level, Subject } from '@/types/class';

export type CreateSchoolSubjectInput = {
  name: string;
  code?: string;
  levelIds: number[];
  weeklyHours?: number | null;
  coefficient?: number | null;
  enableImmediately: boolean;
};

export type CreateSchoolSubjectResult =
  | {
      ok: true;
      subjectId: number;
      linkedLevelIds: number[];
      failedLevelIds: number[];
      enabledImmediately: boolean;
    }
  | { ok: false; error: ApiErrorBody; subjectId?: number };

export type LinkSubjectToLevelsResult = {
  linkedLevelIds: number[];
  failedLevelIds: number[];
  errors: Map<number, ApiErrorBody>;
};

function asLevel(data: unknown): Level | null {
  if (!data || typeof data !== 'object') return null;
  const record = data as Level;
  return typeof record.id === 'number' ? record : null;
}

function asSubject(data: unknown): Subject | null {
  if (!data || typeof data !== 'object') return null;
  const record = data as Subject;
  return typeof record.id === 'number' ? record : null;
}

export function buildCreateSchoolSubjectPayload(input: CreateSchoolSubjectInput): Record<string, unknown> {
  const name = input.name.trim();
  const code = input.code?.trim() || undefined;
  const levelIds = [...new Set(input.levelIds.filter((id) => Number.isFinite(id) && id > 0))];
  const payload: Record<string, unknown> = {
    name,
    sequence: 10,
    category: 'other',
    credit_hours: 1,
    // Forward-compatible fields for tenants whose API accepts them.
    level_ids: levelIds,
    enable_immediately: input.enableImmediately,
  };
  if (code) payload.code = code;
  if (input.weeklyHours != null && Number.isFinite(input.weeklyHours)) {
    payload.weekly_hours = input.weeklyHours;
  }
  if (input.coefficient != null && Number.isFinite(input.coefficient)) {
    // Prefer assessment_coefficient (grading weight); keep aliases for API variants.
    payload.assessment_coefficient = input.coefficient;
    payload.legacy_coefficient = input.coefficient;
    payload.coefficient = input.coefficient;
  }
  return payload;
}

async function applySubjectCoefficient(
  subjectId: number,
  coefficient: number,
  levelIds: number[],
  referenceSubjectId?: number | null,
): Promise<void> {
  await api.post(endpoints.admin.subjectUpdate(subjectId), {
    assessment_coefficient: coefficient,
  });

  if (referenceSubjectId == null) return;
  for (const levelId of levelIds) {
    await api.post(endpoints.admin.subjectsPlanUpdate, {
      level_id: levelId,
      reference_subject_id: referenceSubjectId,
      plan_vals: { assessment_coefficient: coefficient },
    });
  }
}

export function collectLevelSubjectIds(level: Level | null | undefined): number[] {
  if (!level) return [];
  if (Array.isArray(level.subjects) && level.subjects.length > 0) {
    return level.subjects
      .map((s) => s.id)
      .filter((id): id is number => typeof id === 'number' && id > 0);
  }
  return [];
}

export async function linkSubjectToLevels(
  subjectId: number,
  levelIds: number[],
): Promise<LinkSubjectToLevelsResult> {
  const uniqueLevelIds = [...new Set(levelIds.filter((id) => Number.isFinite(id) && id > 0))];
  const linkedLevelIds: number[] = [];
  const failedLevelIds: number[] = [];
  const errors = new Map<number, ApiErrorBody>();

  for (const levelId of uniqueLevelIds) {
    const levelRes = await api.get<Level>(endpoints.admin.level(levelId));
    if (!levelRes.success) {
      failedLevelIds.push(levelId);
      errors.set(levelId, levelRes.error);
      continue;
    }
    const level = asLevel(levelRes.data);
    const existingIds = collectLevelSubjectIds(level);
    if (existingIds.includes(subjectId)) {
      linkedLevelIds.push(levelId);
      continue;
    }
    const updateRes = await api.post(endpoints.admin.levelUpdate(levelId), {
      subject_ids: [...existingIds, subjectId],
    });
    if (!updateRes.success) {
      failedLevelIds.push(levelId);
      errors.set(levelId, updateRes.error);
      continue;
    }
    linkedLevelIds.push(levelId);
  }

  return { linkedLevelIds, failedLevelIds, errors };
}

export async function unlinkSubjectFromLevels(
  subjectId: number,
  levelIds: number[],
): Promise<LinkSubjectToLevelsResult> {
  const uniqueLevelIds = [...new Set(levelIds.filter((id) => Number.isFinite(id) && id > 0))];
  const linkedLevelIds: number[] = [];
  const failedLevelIds: number[] = [];
  const errors = new Map<number, ApiErrorBody>();

  for (const levelId of uniqueLevelIds) {
    const levelRes = await api.get<Level>(endpoints.admin.level(levelId));
    if (!levelRes.success) {
      failedLevelIds.push(levelId);
      errors.set(levelId, levelRes.error);
      continue;
    }
    const level = asLevel(levelRes.data);
    const existingIds = collectLevelSubjectIds(level);
    if (!existingIds.includes(subjectId)) {
      linkedLevelIds.push(levelId);
      continue;
    }
    const updateRes = await api.post(endpoints.admin.levelUpdate(levelId), {
      subject_ids: existingIds.filter((id) => id !== subjectId),
    });
    if (!updateRes.success) {
      failedLevelIds.push(levelId);
      errors.set(levelId, updateRes.error);
      continue;
    }
    linkedLevelIds.push(levelId);
  }

  return { linkedLevelIds, failedLevelIds, errors };
}

export async function syncSubjectLevelLinks(
  subjectId: number,
  nextLevelIds: number[],
  previousLevelIds: number[],
): Promise<LinkSubjectToLevelsResult> {
  const next = new Set(nextLevelIds.filter((id) => Number.isFinite(id) && id > 0));
  const previous = new Set(previousLevelIds.filter((id) => Number.isFinite(id) && id > 0));
  const toAdd = [...next].filter((id) => !previous.has(id));
  const toRemove = [...previous].filter((id) => !next.has(id));

  const addResult = await linkSubjectToLevels(subjectId, toAdd);
  const removeResult = await unlinkSubjectFromLevels(subjectId, toRemove);

  const errors = new Map<number, ApiErrorBody>([
    ...addResult.errors,
    ...removeResult.errors,
  ]);

  return {
    linkedLevelIds: [...addResult.linkedLevelIds, ...removeResult.linkedLevelIds],
    failedLevelIds: [...addResult.failedLevelIds, ...removeResult.failedLevelIds],
    errors,
  };
}

export type UpdateSchoolSubjectInput = CreateSchoolSubjectInput & {
  subjectId: number;
  previousLevelIds?: number[];
  refSubjectId?: number | null;
};

export async function updateSchoolSubject(
  input: UpdateSchoolSubjectInput,
): Promise<CreateSchoolSubjectResult> {
  const name = input.name.trim();
  if (!name) {
    return {
      ok: false,
      error: { code: 'validation_error', message: 'Subject name is required.', details: {} },
    };
  }
  if (!input.levelIds.length) {
    return {
      ok: false,
      error: { code: 'validation_error', message: 'At least one level is required.', details: {} },
    };
  }

  const payload = buildCreateSchoolSubjectPayload(input);
  // Keep identity fields; level membership is synced separately via level updates.
  delete payload.enable_immediately;
  const updateRes = await api.post<Subject>(
    endpoints.admin.subjectUpdate(input.subjectId),
    payload,
  );
  if (!updateRes.success) {
    return { ok: false, error: updateRes.error, subjectId: input.subjectId };
  }

  if (input.weeklyHours != null && Number.isFinite(input.weeklyHours)) {
    await api.post(endpoints.admin.subjectUpdate(input.subjectId), {
      weekly_hours: input.weeklyHours,
    });
  }

  let linkedLevelIds: number[] = [...(input.previousLevelIds ?? [])];
  let failedLevelIds: number[] = [];

  if (input.enableImmediately) {
    const syncResult = await syncSubjectLevelLinks(
      input.subjectId,
      input.levelIds,
      input.previousLevelIds ?? [],
    );
    linkedLevelIds = input.levelIds.filter((id) => !syncResult.failedLevelIds.includes(id));
    failedLevelIds = syncResult.failedLevelIds;
    if (failedLevelIds.length > 0 && linkedLevelIds.length === 0) {
      const firstError = syncResult.errors.values().next().value as ApiErrorBody | undefined;
      return {
        ok: false,
        subjectId: input.subjectId,
        error:
          firstError ?? {
            code: 'validation_error',
            message: 'Subject updated but level sync failed.',
            details: {},
          },
      };
    }
  }

  if (input.coefficient != null && Number.isFinite(input.coefficient)) {
    await applySubjectCoefficient(
      input.subjectId,
      input.coefficient,
      linkedLevelIds.length ? linkedLevelIds : input.levelIds,
      input.refSubjectId,
    );
  }

  return {
    ok: true,
    subjectId: input.subjectId,
    linkedLevelIds,
    failedLevelIds,
    enabledImmediately: input.enableImmediately,
  };
}

export async function createSchoolSubject(
  input: CreateSchoolSubjectInput,
): Promise<CreateSchoolSubjectResult> {
  const name = input.name.trim();
  if (!name) {
    return {
      ok: false,
      error: { code: 'validation_error', message: 'Subject name is required.', details: {} },
    };
  }
  if (!input.levelIds.length) {
    return {
      ok: false,
      error: { code: 'validation_error', message: 'At least one level is required.', details: {} },
    };
  }

  const payload = buildCreateSchoolSubjectPayload(input);
  const createRes = await api.post<Subject>(endpoints.admin.subjects, payload);
  if (!createRes.success) {
    return { ok: false, error: createRes.error };
  }

  const subject = asSubject(createRes.data);
  if (!subject) {
    return {
      ok: false,
      error: {
        code: 'server_error',
        message: 'Subject was created but the response was incomplete.',
        details: {},
      },
    };
  }

  if (input.weeklyHours != null && Number.isFinite(input.weeklyHours)) {
    // Best effort — some backends ignore weekly_hours on create/update for local subjects.
    await api.post(endpoints.admin.subjectUpdate(subject.id), {
      weekly_hours: input.weeklyHours,
    });
  }

  let linkedLevelIds: number[] = [];
  let failedLevelIds: number[] = [];

  if (input.enableImmediately) {
    const linkResult = await linkSubjectToLevels(subject.id, input.levelIds);
    linkedLevelIds = linkResult.linkedLevelIds;
    failedLevelIds = linkResult.failedLevelIds;
    if (!linkedLevelIds.length && failedLevelIds.length > 0) {
      const firstError = linkResult.errors.values().next().value as ApiErrorBody | undefined;
      return {
        ok: false,
        subjectId: subject.id,
        error:
          firstError ?? {
            code: 'validation_error',
            message: 'Subject created but level enablement failed.',
            details: {},
          },
      };
    }
  }

  if (input.coefficient != null && Number.isFinite(input.coefficient)) {
    const detailRes = await api.get<Subject>(endpoints.admin.subject(subject.id));
    const detail = detailRes.success ? asSubject(detailRes.data) : subject;
    await applySubjectCoefficient(
      subject.id,
      input.coefficient,
      linkedLevelIds.length ? linkedLevelIds : input.levelIds,
      detail?.ref_subject_id,
    );
  }

  return {
    ok: true,
    subjectId: subject.id,
    linkedLevelIds,
    failedLevelIds,
    enabledImmediately: linkedLevelIds.length > 0,
  };
}

/** School-local catalog subjects that can be enabled on a level (not yet linked). */
export function listLocalSubjectsAvailableForLevel(
  subjects: Subject[],
  levelId: number,
  enabledOperationalIds: Iterable<number> = [],
): Subject[] {
  const enabled = new Set(
    [...enabledOperationalIds].filter((id) => Number.isFinite(id) && id > 0),
  );
  return subjects
    .filter((subject) => {
      if (subject.active === false) return false;
      if (subject.ref_subject_id != null) return false;
      if (enabled.has(subject.id)) return false;
      const levelIds = Array.isArray(subject.level_ids) ? subject.level_ids : [];
      if (levelIds.includes(levelId)) return false;
      return true;
    })
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
}
