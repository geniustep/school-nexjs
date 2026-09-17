export type StaffTemplateScopeType = 'school' | 'levels' | 'classes';

export interface StaffTemplateScopeSelection {
  level_ids: number[];
  class_ids: number[];
}

export interface StaffTemplateCreateScope {
  school_id: number;
  scope_type: StaffTemplateScopeType;
  level_ids?: number[];
  class_ids?: number[];
}

export type StaffTemplateScopeValidationError =
  | 'school_required'
  | 'scope_not_ready'
  | 'levels_required'
  | 'classes_required';

export interface StaffTemplateScopeValidationResult {
  valid: boolean;
  error: StaffTemplateScopeValidationError | null;
}

export function normalizeStaffTemplateScopeType(raw: unknown): StaffTemplateScopeType | null {
  return raw === 'school' || raw === 'levels' || raw === 'classes' ? raw : null;
}

function normalizeIds(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [];
  return [
    ...new Set(
      raw
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value) && value > 0),
    ),
  ];
}

export function normalizeStaffTemplateScopeSelection(
  raw: Partial<StaffTemplateScopeSelection> | null | undefined,
): StaffTemplateScopeSelection {
  return {
    level_ids: normalizeIds(raw?.level_ids),
    class_ids: normalizeIds(raw?.class_ids),
  };
}

export function resetStaffTemplateScopeSelectionForType(
  selection: StaffTemplateScopeSelection,
  scopeType: StaffTemplateScopeType | null,
): StaffTemplateScopeSelection {
  const normalized = normalizeStaffTemplateScopeSelection(selection);
  if (scopeType === 'levels') {
    return { level_ids: normalized.level_ids, class_ids: [] };
  }
  if (scopeType === 'classes') {
    return { level_ids: [], class_ids: normalized.class_ids };
  }
  return { level_ids: [], class_ids: [] };
}

export function validateStaffTemplateScope(
  scopeType: StaffTemplateScopeType | null,
  selection: StaffTemplateScopeSelection,
  schoolId: number | null,
): StaffTemplateScopeValidationResult {
  if (schoolId == null || !Number.isFinite(schoolId) || schoolId <= 0) {
    return { valid: false, error: 'school_required' };
  }
  if (!scopeType) {
    return { valid: false, error: 'scope_not_ready' };
  }

  const normalized = normalizeStaffTemplateScopeSelection(selection);
  if (scopeType === 'levels' && normalized.level_ids.length === 0) {
    return { valid: false, error: 'levels_required' };
  }
  if (scopeType === 'classes' && normalized.class_ids.length === 0) {
    return { valid: false, error: 'classes_required' };
  }
  return { valid: true, error: null };
}

export function buildStaffTemplateCreateScope(
  schoolId: number | null,
  scopeType: StaffTemplateScopeType | null,
  selection: StaffTemplateScopeSelection,
): StaffTemplateCreateScope | null {
  const validation = validateStaffTemplateScope(scopeType, selection, schoolId);
  if (!validation.valid || !scopeType || schoolId == null) return null;

  const normalized = normalizeStaffTemplateScopeSelection(selection);
  if (scopeType === 'levels') {
    return {
      school_id: schoolId,
      scope_type: 'levels',
      level_ids: normalized.level_ids,
    };
  }
  if (scopeType === 'classes') {
    return {
      school_id: schoolId,
      scope_type: 'classes',
      class_ids: normalized.class_ids,
    };
  }
  return {
    school_id: schoolId,
    scope_type: 'school',
  };
}

export function staffTemplateScopeValidationMessageKey(
  error: StaffTemplateScopeValidationError | null,
): string | null {
  if (!error) return null;
  if (error === 'school_required') return 'admin.staffCenter.smartCreate.errors.scopeSchoolRequired';
  if (error === 'scope_not_ready') return 'admin.staffCenter.smartCreate.errors.scopeNotReady';
  if (error === 'levels_required') return 'admin.staffCenter.smartCreate.errors.scopeLevelsRequired';
  return 'admin.staffCenter.smartCreate.errors.scopeClassesRequired';
}
