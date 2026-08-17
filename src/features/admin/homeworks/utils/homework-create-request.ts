export type HomeworkCreateTarget = {
  class_id: number;
  teacher_id: number;
};

export type HomeworkCreateFields = {
  name: string;
  description?: string;
  subject_id: number;
  academic_year_id: number;
  deadline: string;
  visible_to_student: boolean;
  visible_to_parent: boolean;
  require_submission: boolean;
};

export type HomeworkCreateRequest =
  | {
      mode: 'single';
      path: '/admin/homeworks';
      body: HomeworkCreateFields & HomeworkCreateTarget;
    }
  | {
      mode: 'batch';
      path: '/admin/homeworks/batch';
      body: HomeworkCreateFields & { targets: HomeworkCreateTarget[] };
    };

export type HomeworkFinalizeRequest =
  | {
      mode: 'single';
      path: `/admin/homeworks/upload-sessions/${string}/finalize`;
      body: HomeworkCreateFields & HomeworkCreateTarget;
    }
  | {
      mode: 'batch';
      path: `/admin/homeworks/upload-sessions/${string}/finalize-batch`;
      body: HomeworkCreateFields & { targets: HomeworkCreateTarget[] };
    };

function positiveInteger(value: number, field: string): number {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${field} must be a positive integer`);
  }
  return value;
}

function normalizeHomeworkCreateInput(
  fields: HomeworkCreateFields,
  targets: HomeworkCreateTarget[],
): { fields: HomeworkCreateFields; targets: HomeworkCreateTarget[] } {
  const name = fields.name.trim();
  const deadline = fields.deadline.trim();
  if (!name) throw new Error('name is required');
  if (!deadline) throw new Error('deadline is required');
  positiveInteger(fields.subject_id, 'subject_id');
  positiveInteger(fields.academic_year_id, 'academic_year_id');
  if (targets.length === 0) throw new Error('at least one target is required');

  return {
    fields: {
      ...fields,
      name,
      description: fields.description?.trim() || undefined,
      deadline,
    },
    targets: targets.map((target) => ({
      class_id: positiveInteger(target.class_id, 'class_id'),
      teacher_id: positiveInteger(target.teacher_id, 'teacher_id'),
    })),
  };
}

export function buildHomeworkCreateRequest(
  fields: HomeworkCreateFields,
  targets: HomeworkCreateTarget[],
): HomeworkCreateRequest {
  const normalized = normalizeHomeworkCreateInput(fields, targets);

  if (normalized.targets.length === 1) {
    return {
      mode: 'single',
      path: '/admin/homeworks',
      body: {
        ...normalized.fields,
        ...normalized.targets[0],
      },
    };
  }

  return {
    mode: 'batch',
    path: '/admin/homeworks/batch',
    body: {
      ...normalized.fields,
      targets: normalized.targets,
    },
  };
}

export function buildHomeworkFinalizeRequest(
  publicId: string,
  fields: HomeworkCreateFields,
  targets: HomeworkCreateTarget[],
): HomeworkFinalizeRequest {
  const normalizedPublicId = publicId.trim();
  if (!normalizedPublicId) throw new Error('publicId is required');
  const normalized = normalizeHomeworkCreateInput(fields, targets);

  if (normalized.targets.length === 1) {
    return {
      mode: 'single',
      path: `/admin/homeworks/upload-sessions/${normalizedPublicId}/finalize`,
      body: {
        ...normalized.fields,
        ...normalized.targets[0],
      },
    };
  }

  return {
    mode: 'batch',
    path: `/admin/homeworks/upload-sessions/${normalizedPublicId}/finalize-batch`,
    body: {
      ...normalized.fields,
      targets: normalized.targets,
    },
  };
}
