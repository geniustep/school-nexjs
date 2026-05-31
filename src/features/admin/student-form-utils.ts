import type { ApiErrorBody } from '@/types/api';

export interface StudentFormInput {
  firstName: string;
  lastName: string;
  code: string;
  massarCode: string;
  matricule: string;
  classId: string;
  levelId: string;
  gender: string;
  email: string;
  phone: string;
  dob: string;
  admission: string;
  parentIds: number[];
  /** When true, include active/state fields suitable for create. */
  creating?: boolean;
}

/** Build a POST body accepted by POST /admin/students and /admin/students/{id}/update. */
export function buildStudentPayload(input: StudentFormInput): Record<string, unknown> {
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const explicitCode = input.code.trim();
  const massarCode = input.massarCode.trim();
  let matricule = input.matricule.trim();

  if (massarCode && !matricule && !explicitCode) {
    matricule = massarCode;
  }

  const payload: Record<string, unknown> = {
    first_name: firstName,
    last_name: lastName,
  };

  if (explicitCode) payload.code = explicitCode;
  if (massarCode) payload.massar_code = massarCode;
  if (matricule) payload.matricule = matricule;

  if (input.classId) payload.class_id = Number(input.classId);

  if (input.parentIds.length > 0) {
    payload.parent_ids = input.parentIds.filter((id) => Number.isInteger(id) && id > 0);
  }

  if (input.creating) payload.active = true;

  if (input.levelId) payload.level_id = Number(input.levelId);
  if (input.gender) payload.gender = input.gender;
  if (input.email.trim()) payload.email = input.email.trim();
  if (input.phone.trim()) payload.phone = input.phone.trim();
  if (input.dob) payload.date_of_birth = input.dob;
  if (input.admission) payload.admission_date = input.admission;

  return payload;
}

function msgIncludes(message: string, ...needles: string[]): boolean {
  const lower = message.toLowerCase();
  return needles.some((n) => lower.includes(n.toLowerCase()));
}

/** Map student create/update API errors to user-facing messages. */
export function mapStudentApiError(
  error: ApiErrorBody,
  t: (key: string) => string,
): string {
  const code = String(error.code ?? '');
  const message = error.message?.trim() ?? '';

  if (code === 'duplicate_record' || code === 'conflict') {
    return t('admin.studentDuplicateCode');
  }

  if (code === 'permission_denied' || code === 'forbidden') {
    return t('admin.studentForbidden');
  }

  if (code === 'validation_error') {
    if (
      msgIncludes(message, 'class', 'school', 'مؤسسة', 'قسم', 'scope', 'نطاق', 'outside')
    ) {
      return t('admin.studentClassForbidden');
    }
    if (msgIncludes(message, 'parent', 'ولي', 'أولياء', 'parent_ids')) {
      return t('admin.studentInvalidParents');
    }
    if (message && !msgIncludes(message, '<', 'traceback', 'html')) {
      return message;
    }
    return t('admin.studentValidation');
  }

  if (message && !msgIncludes(message, '<', 'traceback', 'html')) {
    return message;
  }

  return t('errors.serverError');
}
