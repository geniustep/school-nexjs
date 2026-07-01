import type {
  StudentClassOption,
  StudentDocumentTypeOption,
  StudentLevelOption,
  StudentNationalityOption,
  StudentOptions,
  StudentOptionsPayload,
  StudentRefOption,
} from '@/types/student-360';

function labeledOptions(value: unknown): StudentRefOption[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is StudentRefOption => {
      return (
        !!item &&
        typeof item === 'object' &&
        typeof (item as StudentRefOption).value === 'string' &&
        typeof (item as StudentRefOption).label === 'string'
      );
    })
    .map((item) => ({ value: item.value, label: item.label }));
}

function nationalities(value: unknown): StudentNationalityOption[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is StudentNationalityOption => {
      return (
        !!item &&
        typeof item === 'object' &&
        typeof (item as StudentNationalityOption).id === 'number' &&
        typeof (item as StudentNationalityOption).name === 'string'
      );
    })
    .map((item) => ({
      id: item.id,
      name: item.name,
      code: typeof item.code === 'string' ? item.code : null,
    }));
}

function levels(value: unknown): StudentLevelOption[] {
  if (!Array.isArray(value)) return [];
  return value as StudentLevelOption[];
}

function classes(value: unknown): StudentClassOption[] {
  if (!Array.isArray(value)) return [];
  return value as StudentClassOption[];
}

function schools(value: unknown): { id: number; name: string }[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is { id: number; name: string } =>
      !!item && typeof item === 'object' && typeof (item as { id?: unknown }).id === 'number',
  );
}

function academicYears(value: unknown): { id: number; name: string; code?: string | null; is_current?: boolean }[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (item): item is { id: number; name: string; code?: string | null; is_current?: boolean } =>
        !!item && typeof item === 'object' && typeof (item as { id?: unknown }).id === 'number',
    )
    .map((item) => ({
      id: item.id,
      name: item.name,
      code: typeof item.code === 'string' ? item.code : null,
      is_current: item.is_current === true,
    }));
}

function documentTypes(value: unknown): StudentDocumentTypeOption[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is StudentDocumentTypeOption => {
      return (
        !!item &&
        typeof item === 'object' &&
        typeof (item as StudentDocumentTypeOption).id === 'number' &&
        typeof (item as StudentDocumentTypeOption).code === 'string'
      );
    })
    .map((item) => ({
      id: item.id,
      code: item.code,
      name: typeof item.name === 'string' ? item.name : item.code,
      is_required: item.is_required === true,
    }));
}

export function normalizeStudentOptions(
  data: StudentOptionsPayload | null | undefined,
): StudentOptions | null {
  if (!data || typeof data !== 'object') return null;
  return {
    genders: labeledOptions(data.gender),
    studentStatuses: labeledOptions(data.student_status),
    registrationTypes: labeledOptions(data.registration_types),
    emergencyRelationships: labeledOptions(data.emergency_relationships),
    documentTypes: documentTypes(data.document_types),
    documentStates: labeledOptions(data.document_states),
    bloodTypes: labeledOptions(data.blood_types),
    nationalities: nationalities(data.nationalities),
    schools: schools(data.schools),
    academicYears: academicYears(data.academic_years),
    levels: levels(data.levels),
    classes: classes(data.classes),
  };
}

export type EnrollmentClassScopeInput = {
  levelId?: string;
  academicYearId?: string;
  schoolId?: number | null;
};

function resolveEnrollmentClassScope(
  levelIdOrScope: string | EnrollmentClassScopeInput,
): EnrollmentClassScopeInput {
  return typeof levelIdOrScope === 'string' ? { levelId: levelIdOrScope } : levelIdOrScope;
}

/** Classes eligible for enrollment given active school, year, and level. */
export function filterClassesForEnrollment(
  classes: StudentClassOption[],
  levelIdOrScope: string | EnrollmentClassScopeInput,
): StudentClassOption[] {
  const scope = resolveEnrollmentClassScope(levelIdOrScope);
  const levelId = scope.levelId?.trim() ?? '';
  if (!levelId) return [];
  const levelNum = Number(levelId);
  if (!Number.isFinite(levelNum)) return [];

  let filtered = classes.filter((c) => c.level?.id === levelNum);

  const yearId = scope.academicYearId?.trim() ?? '';
  if (yearId) {
    const yearNum = Number(yearId);
    if (Number.isFinite(yearNum)) {
      filtered = filtered.filter(
        (c) => c.academic_year_id == null || c.academic_year_id === yearNum,
      );
    }
  }

  const schoolId = scope.schoolId;
  if (schoolId != null && schoolId > 0) {
    filtered = filtered.filter((c) => c.school_id == null || c.school_id === schoolId);
  }

  return filtered;
}

export function isEnrollmentClassIdInScope(
  classId: string,
  classes: StudentClassOption[],
  scope: EnrollmentClassScopeInput,
): boolean {
  const normalized = classId.trim();
  if (!normalized || !scope.levelId?.trim()) return false;
  return filterClassesForEnrollment(classes, scope).some((c) => String(c.id) === normalized);
}

export function buildEnrollmentClassScope(
  levelId: string,
  academicYearId: string,
  schoolId: number | null,
): EnrollmentClassScopeInput {
  return { levelId, academicYearId, schoolId };
}
