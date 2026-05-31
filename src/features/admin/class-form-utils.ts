import type { ApiErrorBody } from '@/types/api';
import type { Ref } from '@/types/api';

export interface ClassAcademicYearSource {
  academic_year_id?: number;
  academic_year?: string | Ref | { id: number; name: string } | null;
}

export interface ClassFormInput {
  name: string;
  levelId: string;
  academicYearId: string;
  capacity: string;
  room: string;
  teacherIds: number[];
  subjectIds: number[];
  creating?: boolean;
}

export function resolveAcademicYearId(cls?: ClassAcademicYearSource): string {
  if (cls?.academic_year_id) return String(cls.academic_year_id);
  const ay = cls?.academic_year;
  if (ay && typeof ay === 'object' && 'id' in ay) return String(ay.id);
  return '';
}

/** Build a POST body accepted by POST /admin/classes and /admin/classes/{id}/update. */
export function buildClassPayload(input: ClassFormInput): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    name: input.name.trim(),
    level_id: Number(input.levelId),
  };

  const year = input.academicYearId.trim();
  if (year) payload.academic_year_id = Number(year);

  if (input.capacity.trim()) payload.capacity = Number(input.capacity);
  if (input.room.trim()) payload.room_number = input.room.trim();

  const teachers = input.teacherIds.filter((id) => Number.isInteger(id) && id > 0);
  if (teachers.length > 0) payload.teacher_ids = teachers;

  const subjects = input.subjectIds.filter((id) => Number.isInteger(id) && id > 0);
  if (subjects.length > 0) payload.subject_ids = subjects;

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
