import type {
  TeacherCreateAssignmentInput,
  TeacherCreateRequest,
  TeacherCreateResult,
  TeacherOptions,
  TeacherProfileFormState,
} from '@/types/teacher';

export type TeacherCreateAssignmentDraft = {
  key: string;
  classId: number;
  subjectId: number;
};

export type TeacherCreateFormState = {
  name: string;
  phone: string;
  email: string;
  schoolId: string;
};

export type TeacherCreateFieldErrors = Partial<
  Record<'name' | 'email' | 'schoolId' | 'assignments', string>
>;

export const TEACHER_CREATE_RESULT_STORAGE_PREFIX = 'raqeem.teacherCreateResult.';

export function defaultTeacherCreateFormState(
  options: TeacherOptions | null,
): TeacherCreateFormState {
  return {
    name: '',
    phone: '',
    email: '',
    schoolId: options?.schools.length === 1 ? String(options.schools[0].id) : '',
  };
}

export function createEmptyTeacherCreateAssignmentDraft(): TeacherCreateAssignmentDraft {
  return {
    key: `new-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    classId: 0,
    subjectId: 0,
  };
}

export function isTeacherCreateAssignmentComplete(row: TeacherCreateAssignmentDraft): boolean {
  return row.classId > 0 && row.subjectId > 0;
}

export function teacherCreateAssignmentPairKey(classId: number, subjectId: number): string {
  return `${classId}:${subjectId}`;
}

export function findDuplicateTeacherCreateAssignmentKey(
  rows: TeacherCreateAssignmentDraft[],
): string | null {
  const seen = new Set<string>();
  for (const row of rows) {
    if (!isTeacherCreateAssignmentComplete(row)) continue;
    const key = teacherCreateAssignmentPairKey(row.classId, row.subjectId);
    if (seen.has(key)) return key;
    seen.add(key);
  }
  return null;
}

export function normalizeTeacherCreateAssignmentDrafts(
  rows: TeacherCreateAssignmentDraft[],
): TeacherCreateAssignmentInput[] {
  return rows.filter(isTeacherCreateAssignmentComplete).map((row) => ({
    class_id: row.classId,
    subject_id: row.subjectId,
    role: 'main' as const,
  }));
}

/** Build create payload — never sends code, create_account, account, login, or password. */
export function buildSimplifiedTeacherCreatePayload(
  state: TeacherCreateFormState,
  assignmentRows: TeacherCreateAssignmentDraft[],
  options: TeacherOptions | null,
): TeacherCreateRequest {
  const payload: TeacherCreateRequest = {
    name: state.name.trim(),
  };

  const phone = state.phone.trim();
  if (phone) payload.phone = phone;

  const email = state.email.trim();
  if (email) payload.email = email;

  const defaultType =
    options?.defaults.teacherType &&
    options.teacherTypes.some((item) => item.value === options.defaults.teacherType)
      ? options.defaults.teacherType
      : options?.teacherTypes[0]?.value;
  if (defaultType) payload.teacher_type = defaultType;

  payload.status = options?.defaults.status ?? 'active';
  payload.active = options?.defaults.active ?? true;

  if (options && options.schools.length > 1 && state.schoolId) {
    payload.school_id = Number(state.schoolId);
  }

  const assignments = normalizeTeacherCreateAssignmentDrafts(assignmentRows);
  if (assignments.length > 0) payload.assignments = assignments;

  return payload;
}

export function validateTeacherCreateForm(
  state: TeacherCreateFormState,
  assignmentRows: TeacherCreateAssignmentDraft[],
  options: TeacherOptions | null,
  t: (key: string) => string,
): { valid: boolean; errors: TeacherCreateFieldErrors } {
  const errors: TeacherCreateFieldErrors = {};

  if (!state.name.trim()) {
    errors.name = t('errors.validationFailed');
  }

  const email = state.email.trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = t('admin.academicSetup.teacherForm.errors.invalidEmail');
  }

  if (options && options.schools.length > 1 && state.schoolId) {
    if (!options.schools.some((school) => String(school.id) === state.schoolId)) {
      errors.schoolId = t('admin.academicSetup.teacherForm.errors.schoolNotAllowed');
    }
  }

  const incomplete = assignmentRows.some(
    (row) => (row.classId || row.subjectId) && !isTeacherCreateAssignmentComplete(row),
  );
  if (incomplete) {
    errors.assignments = t('admin.academicSetup.teacherForm.incompleteAssignment');
  } else if (findDuplicateTeacherCreateAssignmentKey(assignmentRows)) {
    errors.assignments = t('admin.academicSetup.teacherForm.duplicateAssignment');
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function asBool(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function asString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
}

/** Normalize create API data — can_login is never inferred locally from has_account. */
export function normalizeTeacherCreateResult(data: unknown): TeacherCreateResult | null {
  const root = asRecord(data);
  if (!root) return null;

  const item = asRecord(root.item) ?? root;
  const teacherId =
    asNumber(item.id) ??
    asNumber(root.teacher_id) ??
    asNumber(root.id) ??
    asNumber(asRecord(root.teacher)?.id);
  if (teacherId == null) return null;

  const accountRaw = asRecord(root.account) ?? asRecord(item.account);
  const assignmentsRaw = asRecord(root.assignments) ?? asRecord(item.assignments);
  const lifecycleRaw = asRecord(root.lifecycle) ?? asRecord(item.lifecycle);

  const accountCreated = asBool(accountRaw?.created, Boolean(asNumber(accountRaw?.user_id)));
  const accountCanLogin = asBool(accountRaw?.can_login, false);
  const accountStatus =
    asString(accountRaw?.status) ??
    (accountCreated ? 'password_setup_required' : 'not_created');

  const assignmentsRequested = asNumber(assignmentsRaw?.requested) ?? 0;
  const assignmentsCreated = asNumber(assignmentsRaw?.created) ?? 0;

  const lifecycleHasAccount = asBool(lifecycleRaw?.has_account, accountCreated);
  const lifecycleCanLogin = asBool(lifecycleRaw?.can_login, accountCanLogin);
  const assignmentsCount =
    asNumber(lifecycleRaw?.assignments_count) ?? assignmentsCreated;
  const hasAssignments = asBool(lifecycleRaw?.has_assignments, assignmentsCount > 0);

  const warnings = Array.isArray(root.warnings)
    ? root.warnings.filter((item): item is string => typeof item === 'string')
    : undefined;
  const allowedActions = Array.isArray(root.allowed_actions)
    ? root.allowed_actions.filter((item): item is string => typeof item === 'string')
    : undefined;

  return {
    teacher_id: teacherId,
    name: asString(item.name) ?? asString(root.name),
    code: asString(item.code) ?? asString(root.code),
    account: {
      requested: typeof accountRaw?.requested === 'boolean' ? accountRaw.requested : undefined,
      created: accountCreated,
      user_id: asNumber(accountRaw?.user_id),
      status: accountStatus,
      login: asString(accountRaw?.login),
      password_was_set: asBool(accountRaw?.password_was_set, false),
      can_login: accountCanLogin,
    },
    assignments: {
      requested: assignmentsRequested,
      created: assignmentsCreated,
      items: Array.isArray(assignmentsRaw?.items) ? assignmentsRaw.items : undefined,
    },
    lifecycle: {
      teacher_registered: asBool(lifecycleRaw?.teacher_registered, true),
      has_account: lifecycleHasAccount,
      can_login: lifecycleCanLogin,
      has_assignments: hasAssignments,
      assignments_count: assignmentsCount,
    },
    warnings,
    allowed_actions: allowedActions,
    raw: data,
  };
}

/**
 * In-memory pending create results.
 * Survives React Strict Mode remounts (effects re-run) without losing the banner payload.
 * Cleared only via dismissTeacherCreateResult (user close / explicit clear).
 */
const pendingTeacherCreateResults = new Map<number, TeacherCreateResult>();

function teacherCreateResultStorageKey(teacherId: number): string {
  return `${TEACHER_CREATE_RESULT_STORAGE_PREFIX}${teacherId}`;
}

/** Test-only: clear memory + matching session keys for isolated unit tests. */
export function resetTeacherCreateResultStoreForTests(): void {
  pendingTeacherCreateResults.clear();
  if (typeof window === 'undefined') return;
  try {
    const prefix = TEACHER_CREATE_RESULT_STORAGE_PREFIX;
    const keys: string[] = [];
    for (let i = 0; i < sessionStorage.length; i += 1) {
      const key = sessionStorage.key(i);
      if (key?.startsWith(prefix)) keys.push(key);
    }
    for (const key of keys) sessionStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export function storeTeacherCreateResult(result: TeacherCreateResult): void {
  pendingTeacherCreateResults.set(result.teacher_id, result);
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(teacherCreateResultStorageKey(result.teacher_id), JSON.stringify(result));
  } catch {
    /* ignore quota / private mode — memory still holds the result for SPA navigation */
  }
}

/**
 * Idempotent read of a pending create result for a teacher profile.
 * Safe under React Strict Mode double-invoke: does not drop the payload on first read.
 * Prefer dismissTeacherCreateResult when the banner is closed.
 */
export function consumeTeacherCreateResult(teacherId: number): TeacherCreateResult | null {
  const fromMemory = pendingTeacherCreateResults.get(teacherId);
  if (fromMemory) return fromMemory;

  if (typeof window === 'undefined') return null;
  const key = teacherCreateResultStorageKey(teacherId);
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const normalized = normalizeTeacherCreateResult(JSON.parse(raw));
    if (!normalized) {
      sessionStorage.removeItem(key);
      return null;
    }
    // Hydrate memory then drop session entry so refresh does not re-show forever,
    // while Strict Mode remounts still see the in-memory copy.
    pendingTeacherCreateResults.set(teacherId, normalized);
    sessionStorage.removeItem(key);
    return normalized;
  } catch {
    return null;
  }
}

/** Clear pending create result after the user dismisses the readiness banner. */
export function dismissTeacherCreateResult(teacherId: number): void {
  pendingTeacherCreateResults.delete(teacherId);
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(teacherCreateResultStorageKey(teacherId));
  } catch {
    /* ignore */
  }
}

/** Guard: create payload must never include account-control fields. */
export function assertSafeTeacherCreatePayload(payload: TeacherCreateRequest): boolean {
  const record = payload as Record<string, unknown>;
  if ('code' in record && record.code != null && record.code !== '') return false;
  if ('create_account' in record) return false;
  if ('account' in record) return false;
  if ('login' in record) return false;
  if ('password' in record) return false;
  if ('password_confirm' in record) return false;
  return Boolean(payload.name?.trim());
}

/** Map legacy profile state into create form when needed by tests/helpers. */
export function teacherCreateFormFromProfileState(
  state: TeacherProfileFormState,
): TeacherCreateFormState {
  return {
    name: state.name,
    phone: state.phone,
    email: state.email,
    schoolId: state.schoolId,
  };
}
