import type {
  StudentClassOption,
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

function academicYears(value: unknown): { id: number; name: string; code?: string | null }[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is { id: number; name: string; code?: string | null } =>
      !!item && typeof item === 'object' && typeof (item as { id?: unknown }).id === 'number',
  );
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
    nationalities: nationalities(data.nationalities),
    schools: schools(data.schools),
    academicYears: academicYears(data.academic_years),
    levels: levels(data.levels),
    classes: classes(data.classes),
  };
}

export function filterClassesForEnrollment(
  classes: StudentClassOption[],
  levelId: string,
): StudentClassOption[] {
  if (!levelId) return classes;
  const levelNum = Number(levelId);
  if (!Number.isFinite(levelNum)) return classes;
  return classes.filter((c) => c.level?.id === levelNum);
}
