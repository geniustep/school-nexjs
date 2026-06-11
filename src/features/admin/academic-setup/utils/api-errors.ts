import type { ApiErrorBody } from '@/types/api';

const ASSIGNMENT_ERRORS: Record<string, string> = {
  assignment_duplicate: 'admin.academicSetup.errors.assignmentDuplicate',
  assignment_in_use: 'admin.academicSetup.errors.assignmentInUse',
  teacher_school_mismatch: 'admin.academicSetup.errors.teacherSchoolMismatch',
  teacher_subject_mismatch: 'admin.academicSetup.errors.teacherSubjectMismatch',
  class_subject_mismatch: 'admin.academicSetup.errors.classSubjectMismatch',
  teacher_workload_exceeded: 'admin.academicSetup.errors.teacherWorkloadExceeded',
  teacher_target_hours_exceeded: 'admin.academicSetup.errors.teacherTargetHoursExceeded',
};

const STAFF_ERRORS: Record<string, string> = {
  duplicate_login: 'admin.academicSetup.errors.duplicateLogin',
  invalid_admin_kind: 'admin.academicSetup.errors.invalidAdminKind',
  school_out_of_scope: 'admin.academicSetup.errors.schoolOutOfScope',
  default_school_mismatch: 'admin.academicSetup.errors.defaultSchoolMismatch',
  scope_school_mismatch: 'admin.academicSetup.errors.scopeSchoolMismatch',
  scope_level_mismatch: 'admin.academicSetup.errors.scopeLevelMismatch',
  scope_class_mismatch: 'admin.academicSetup.errors.scopeClassMismatch',
  capability_not_grantable: 'admin.academicSetup.errors.capabilityNotGrantable',
  privilege_escalation: 'admin.academicSetup.errors.privilegeEscalation',
  cannot_deactivate_self: 'admin.academicSetup.errors.cannotDeactivateSelf',
  cannot_deactivate_last_manager: 'admin.academicSetup.errors.cannotDeactivateLastManager',
  protected_account: 'admin.academicSetup.errors.protectedAccount',
};

const TRACK_ERRORS: Record<string, string> = {
  track_duplicate: 'admin.academicSetup.errors.trackDuplicate',
  track_in_use: 'admin.academicSetup.errors.trackInUse',
  level_does_not_support_tracks: 'admin.academicSetup.errors.levelNoTracks',
  reference_track_mismatch: 'admin.academicSetup.errors.referenceTrackMismatch',
  track_level_mismatch: 'admin.academicSetup.errors.trackLevelMismatch',
  class_track_mismatch: 'admin.academicSetup.errors.classTrackMismatch',
};

const CLASS_TRACK_ERRORS: Record<string, string> = {
  class_track_mismatch: 'admin.academicSetup.errors.classTrackMismatch',
  track_level_mismatch: 'admin.academicSetup.errors.trackLevelMismatch',
};

const LEVEL_ERRORS: Record<string, string> = {
  already_enabled: 'admin.academicSetup.errors.alreadyEnabled',
  invalid_reference_level: 'admin.academicSetup.errors.invalidReferenceLevel',
  level_out_of_scope: 'admin.academicSetup.errors.levelOutOfScope',
};

export function mapAcademicSetupApiError(
  error: ApiErrorBody,
  t: (key: string) => string,
  domain: 'assignment' | 'staff' | 'track' | 'class' | 'level' = 'assignment',
): string {
  const code = String(error.code ?? '');
  const table =
    domain === 'staff'
      ? STAFF_ERRORS
      : domain === 'track'
        ? TRACK_ERRORS
        : domain === 'class'
          ? CLASS_TRACK_ERRORS
          : domain === 'level'
            ? LEVEL_ERRORS
            : ASSIGNMENT_ERRORS;

  const key = table[code];
  if (key) {
    const msg = t(key);
    if (msg !== key) return msg;
  }

  if (code === 'permission_denied' || code === 'forbidden') {
    return t('admin.pageForbidden');
  }

  if (code === 'unauthenticated') {
    return t('errors.sessionExpired');
  }

  const message = error.message?.trim();
  if (message && !message.includes('<') && !message.toLowerCase().includes('traceback')) {
    return message;
  }

  return t('errors.serverError');
}

export function mapWarningCode(code: string, t: (key: string) => string): string {
  const key = `admin.academicSetup.warnings.${code}`;
  const msg = t(key);
  return msg !== key ? msg : code;
}

export function mapSuggestionReason(code: string, t: (key: string) => string): string {
  const key = `admin.academicSetup.suggestReasons.${code}`;
  const msg = t(key);
  return msg !== key ? msg : code;
}
