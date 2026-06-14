import type { StudentOptions } from '@/types/student-360';
import type {
  StudentImportReferenceAcademicYear,
  StudentImportReferenceClass,
  StudentImportReferenceData,
  StudentImportReferenceLevel,
  StudentImportReferenceSchool,
} from './student-import-types';

function schoolCode(school: { id: number; name: string; code?: string | null }): string {
  const code = typeof school.code === 'string' ? school.code.trim() : '';
  return code || String(school.id);
}

function yearCode(year: { id: number; name: string; code?: string | null }): string {
  const code = typeof year.code === 'string' ? year.code.trim() : '';
  return code || String(year.id);
}

function levelCode(level: { id: number; name: string; code?: string | null }): string {
  const code = typeof level.code === 'string' ? level.code.trim() : '';
  return code || String(level.id);
}

function classCode(cls: { id: number; name: string; code?: string | null }): string {
  const code = typeof cls.code === 'string' ? cls.code.trim() : '';
  return code || String(cls.id);
}

export function buildStudentImportReferenceData(
  options: StudentOptions | null,
): StudentImportReferenceData | null {
  if (!options) return null;

  const genders = new Set(options.genders.map((g) => g.value));
  const studentStatuses = new Set(options.studentStatuses.map((s) => s.value));
  const registrationTypes = new Set(options.registrationTypes.map((r) => r.value));
  const emergencyRelationships = new Set(options.emergencyRelationships.map((r) => r.value));

  const nationalities = new Map<string, number>();
  for (const n of options.nationalities) {
    if (n.code) nationalities.set(n.code.trim(), n.id);
    nationalities.set(String(n.id), n.id);
  }

  const schools = new Map<string, StudentImportReferenceSchool>();
  for (const s of options.schools) {
    const code = schoolCode(s);
    schools.set(code, { id: s.id, name: s.name, code });
    schools.set(String(s.id), { id: s.id, name: s.name, code });
  }

  const academicYears = new Map<string, StudentImportReferenceAcademicYear>();
  for (const y of options.academicYears) {
    const code = yearCode(y);
    academicYears.set(code, { id: y.id, name: y.name, code });
    academicYears.set(String(y.id), { id: y.id, name: y.name, code });
  }

  const levels = new Map<string, StudentImportReferenceLevel>();
  for (const l of options.levels) {
    const code = levelCode(l);
    const entry: StudentImportReferenceLevel = {
      id: l.id,
      name: l.name,
      code,
      schoolId: l.school_id ?? null,
      academicYearId: l.academic_year_id ?? null,
    };
    levels.set(code, entry);
    levels.set(String(l.id), entry);
  }

  const classes = new Map<string, StudentImportReferenceClass>();
  for (const c of options.classes) {
    const code = classCode(c);
    const entry: StudentImportReferenceClass = {
      id: c.id,
      name: c.name,
      code,
      schoolId: c.school_id ?? null,
      academicYearId: c.academic_year_id ?? null,
      levelId: c.level?.id ?? null,
    };
    classes.set(code, entry);
    classes.set(String(c.id), entry);
  }

  return {
    genders,
    studentStatuses,
    registrationTypes,
    emergencyRelationships,
    nationalities,
    schools,
    academicYears,
    levels,
    classes,
  };
}

export function referenceListValues(reference: StudentImportReferenceData, key: string): string[] {
  switch (key) {
    case 'gender':
      return [...reference.genders];
    case 'status':
      return [...reference.studentStatuses];
    case 'registration_type':
      return [...reference.registrationTypes];
    case 'emergency_relationship':
      return [...reference.emergencyRelationships];
    case 'nationality_code':
      return [...reference.nationalities.keys()].filter((k) => !/^\d+$/.test(k));
    case 'school_code':
      return uniqueById(reference.schools);
    case 'academic_year_code':
      return uniqueById(reference.academicYears);
    case 'level_code':
      return uniqueById(reference.levels);
    case 'class_code':
      return uniqueById(reference.classes);
    case 'is_repeating':
      return ['yes', 'no'];
    default:
      return [];
  }
}

function uniqueById<T extends { id: number; code: string }>(map: Map<string, T>): string[] {
  const seen = new Set<number>();
  const values: string[] = [];
  for (const item of map.values()) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    values.push(item.code);
  }
  return values.sort((a, b) => a.localeCompare(b));
}
