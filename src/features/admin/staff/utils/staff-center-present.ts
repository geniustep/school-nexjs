import { resolveCapabilityLabel } from '@/features/admin/academic-setup/utils/capability-present';
import { resolveStaffAdminKindLabel } from '@/features/admin/academic-setup/utils/staff-present';
import type { Locale } from '@/lib/i18n/config';
import type { StaffMember } from '@/types/academic-setup';
import type { StaffCreationTemplate, StaffTemplateCreateResult } from '@/types/staff-templates';

const NOISE_PERMISSION_CODES = new Set([
  'assigned',
  'unknown',
  'unassigned',
  'none',
]);

const RAW_STAFF_DISPLAY_TOKENS = new Set([
  'unknown',
  'assigned',
  'unassigned',
  'none',
  'registration_officer',
  'subject_teacher',
]);

const REGISTRATION_OFFICER_LABEL_MARKERS = [
  'registration_officer',
  'registration officer',
  'مسؤول تسجيل',
  'officier d inscription',
  'oficial de registro',
];

function isRegistrationOfficerScopeLabel(name: string, code?: string | null): boolean {
  const normalizedCode = code?.trim().toLowerCase();
  if (normalizedCode === 'registration_officer') return true;

  const normalizedName = name.trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
  return REGISTRATION_OFFICER_LABEL_MARKERS.some((marker) => {
    const normalizedMarker = marker.toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
    return normalizedName === normalizedMarker || normalizedName.includes(normalizedMarker);
  });
}

const PASSWORD_WARNING_CODES = new Set([
  'password_required',
  'password_not_set',
  'account_password_missing',
  'missing_password',
]);

export function isNoisePermissionCode(code: string): boolean {
  return NOISE_PERMISSION_CODES.has(code.trim().toLowerCase());
}

export function isRawStaffDisplayToken(value: string | null | undefined): boolean {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return false;
  if (RAW_STAFF_DISPLAY_TOKENS.has(normalized)) return true;
  if (isNoisePermissionCode(normalized)) return true;
  return false;
}

export function resolveStaffWarningText(
  warning: { code?: string; message?: string },
  t: (key: string) => string,
): string {
  const code = warning.code?.trim() ?? '';
  const message = warning.message?.trim() ?? '';

  if (message && !isRawStaffDisplayToken(message)) {
    return message;
  }

  if (code) {
    const key = `admin.staffCenter.warnings.${code}`;
    const translated = t(key);
    if (translated !== key) return translated;
  }

  if (isRawStaffDisplayToken(message) || isRawStaffDisplayToken(code)) {
    if (code === 'assigned' || message.toLowerCase() === 'assigned') {
      return t('admin.staffCenter.permissionsModes.assigned');
    }
    return t('admin.staffCenter.userType.unknown');
  }

  return t('admin.staffCenter.warnings.generic');
}

export function resolveStaffRoleTemplateChipLabel(
  raw: string,
  member: Pick<StaffMember, 'role_display_name' | 'admin_kind' | 'creation_template_code' | 'teacher_id' | 'is_teacher'>,
  t: (key: string) => string,
): string {
  const trimmed = raw.trim();
  const normalized = trimmed.toLowerCase();
  const roleLabel = resolveStaffRoleDisplayLabel(member, t);

  if (isRawStaffDisplayToken(trimmed)) {
    if (roleLabel !== t('common.dash')) return roleLabel;
    if (
      normalized === 'registration_officer' ||
      normalized === 'subject_teacher' ||
      member.teacher_id ||
      member.is_teacher
    ) {
      return t('admin.staffCenter.userType.teacher');
    }
    return t('admin.staffCenter.userType.unknown');
  }

  const templateLabel = resolveStaffCreationTemplateLabel(trimmed, t);
  if (templateLabel && templateLabel !== trimmed) return templateLabel;

  const kindLabel = resolveStaffAdminKindLabel(trimmed, t);
  if (kindLabel !== trimmed) return kindLabel;

  return trimmed;
}

export function resolveStaffScopeRoleTemplateLabel(
  scope: { role_template_name?: string | null; role_template_code?: string | null },
  member: Pick<StaffMember, 'role_display_name' | 'admin_kind' | 'creation_template_code' | 'teacher_id' | 'is_teacher'>,
  t: (key: string) => string,
): string {
  const code = scope.role_template_code?.trim();
  if (code && isRawStaffDisplayToken(code)) {
    return resolveStaffRoleTemplateChipLabel(code, member, t);
  }

  const name = scope.role_template_name?.trim();
  if (name && isRegistrationOfficerScopeLabel(name, code) && (member.teacher_id || member.is_teacher)) {
    const roleLabel = resolveStaffRoleDisplayLabel(member, t);
    if (roleLabel !== t('common.dash')) return roleLabel;
    return t('admin.staffCenter.userType.teacher');
  }

  if (name && !isRawStaffDisplayToken(name)) return name;

  if (code) {
    return resolveStaffRoleTemplateChipLabel(code, member, t);
  }

  return resolveStaffRoleDisplayLabel(member, t);
}

export function resolveTeacherTypeDisplayLabel(
  member: Pick<StaffMember, 'role_display_name' | 'admin_kind' | 'creation_template_code' | 'teacher_type'>,
  teacherTypeOverride: string | null | undefined,
  t: (key: string) => string,
): string {
  const raw = (teacherTypeOverride ?? member.teacher_type)?.trim();
  const roleLabel = resolveStaffRoleDisplayLabel(member, t);

  if (!raw) {
    return roleLabel !== t('common.dash') ? roleLabel : t('common.dash');
  }

  if (isRawStaffDisplayToken(raw)) {
    return roleLabel !== t('common.dash') ? roleLabel : t('admin.staffCenter.userType.unknown');
  }

  const typeKey = `admin.academicSetup.teacherTypes.${raw}`;
  const typeTranslated = t(typeKey);
  if (typeTranslated !== typeKey) return typeTranslated;

  const creationLabel = resolveStaffCreationTemplateLabel(raw, t);
  if (creationLabel && creationLabel !== raw) return creationLabel;

  return raw;
}

export function resolveTeacherTypeLabelFromCode(
  teacherType: string | null | undefined,
  t: (key: string) => string,
): string {
  const raw = teacherType?.trim();
  if (!raw) return t('common.dash');
  if (isRawStaffDisplayToken(raw)) return t('admin.staffCenter.userType.unknown');

  const typeKey = `admin.academicSetup.teacherTypes.${raw}`;
  const typeTranslated = t(typeKey);
  if (typeTranslated !== typeKey) return typeTranslated;

  const creationLabel = resolveStaffCreationTemplateLabel(raw, t);
  if (creationLabel && creationLabel !== raw) return creationLabel;

  return raw;
}

export function resolveStaffPermissionLabel(
  code: string,
  locale: Locale,
  t: (key: string) => string,
): string | null {
  const trimmed = code.trim();
  if (!trimmed || isNoisePermissionCode(trimmed)) return null;

  const smartKey = `admin.staffCenter.smartCreate.capabilities.${trimmed}`;
  const smartLabel = t(smartKey);
  if (smartLabel !== smartKey) return smartLabel;

  return resolveCapabilityLabel(locale, { code: trimmed, label: '' });
}

export function resolveStaffCreationTemplateLabel(
  code: string | null | undefined,
  t: (key: string) => string,
): string {
  const trimmed = code?.trim();
  if (!trimmed) return '';
  const key = `admin.staffCenter.creationTemplates.${trimmed}`;
  const label = t(key);
  if (label !== key) return label;
  return trimmed.replace(/_/g, ' ');
}

export function resolveStaffRoleDisplayLabel(
  member: Pick<StaffMember, 'role_display_name' | 'admin_kind' | 'creation_template_code'>,
  t: (key: string) => string,
): string {
  const display = member.role_display_name?.trim();
  if (display && !isRawStaffDisplayToken(display)) {
    return display;
  }

  const templateLabel = resolveStaffCreationTemplateLabel(member.creation_template_code, t);
  if (templateLabel) return templateLabel;

  if (member.admin_kind) {
    const kindLabel = resolveStaffAdminKindLabel(member.admin_kind, t);
    if (kindLabel !== member.admin_kind && kindLabel !== 'registration_officer') {
      return kindLabel;
    }
  }

  return display || templateLabel || t('common.dash');
}

export function staffNeedsPasswordSetup(member: StaffMember): boolean {
  const accountRecord = member.account as { needs_password?: boolean } | null | undefined;
  if (accountRecord?.needs_password === true) return true;

  return (member.warnings ?? []).some((warning) =>
    PASSWORD_WARNING_CODES.has(warning.code.trim().toLowerCase()),
  );
}

export function resolveStaffTemplateCreateRedirect(
  result: StaffTemplateCreateResult,
  template: StaffCreationTemplate | null | undefined,
): { primary: 'teacher' | 'staff'; teacherId: number | null; userId: number | null } {
  const userId = result.staff?.user_id ?? result.user_id ?? null;
  const teacherId = result.staff?.teacher_id ?? result.teacher_id ?? null;
  const isTeacher = teacherId != null && (template?.creates_teacher_profile ?? true);

  if (isTeacher && teacherId != null) {
    return { primary: 'teacher', teacherId, userId };
  }

  return { primary: 'staff', teacherId, userId };
}

export function filterDisplayPermissionCodes(codes: string[] | undefined): string[] {
  if (!codes?.length) return [];
  return codes.filter((code) => !isNoisePermissionCode(code));
}

export function resolvePermissionsModeLabel(
  mode: string | null | undefined,
  t: (key: string) => string,
): string {
  const trimmed = mode?.trim();
  if (!trimmed) return t('common.dash');
  const key = `admin.staffCenter.permissionsModes.${trimmed}`;
  const label = t(key);
  return label !== key ? label : t('common.dash');
}
