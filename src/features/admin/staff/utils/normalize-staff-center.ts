import { normalizeStaffMember } from '@/features/admin/academic-setup/utils/staff-utils';
import { normalizeStaffAllowedActions } from '@/features/admin/staff/utils/staff-allowed-actions';
import { normalizeStaffWarnings } from '@/features/admin/staff/utils/staff-warnings';
import type {
  PermissionsMode,
  StaffDetailEnvelope,
  StaffEffectivePermissionsPayload,
  StaffMember,
  StaffScope,
  StaffTeacherLink,
} from '@/types/academic-setup';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function asBool(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

function normalizeTeacherLink(raw: unknown): StaffTeacherLink | null {
  const record = asRecord(raw);
  const id = asNumber(record?.id);
  const name = asString(record?.name);
  if (id == null || !name) return null;
  return {
    id,
    name,
    code: asString(record?.code),
    teacher_type: asString(record?.teacher_type),
    state: asString(record?.state),
    subjects_count: asNumber(record?.subjects_count) ?? undefined,
    classes_count: asNumber(record?.classes_count) ?? undefined,
    assignments_count: asNumber(record?.assignments_count) ?? undefined,
    subjects: Array.isArray(record?.subjects)
      ? record!.subjects
          .filter((item) => asRecord(item) && asNumber(asRecord(item)!.id) != null)
          .map((item) => {
            const row = asRecord(item)!;
            return {
              id: asNumber(row.id)!,
              name: asString(row.name) ?? '—',
              code: asString(row.code),
            };
          })
      : [],
    classes: Array.isArray(record?.classes)
      ? record!.classes
          .filter((item) => asRecord(item) && asNumber(asRecord(item)!.id) != null)
          .map((item) => {
            const row = asRecord(item)!;
            return { id: asNumber(row.id)!, name: asString(row.name) ?? '—' };
          })
      : [],
  };
}

function normalizeScopes(raw: unknown): StaffScope[] {
  if (!Array.isArray(raw)) return [];
  const scopes: StaffScope[] = [];
  for (const item of raw) {
    const record = asRecord(item);
    if (!record) continue;
    scopes.push({
      role_template_id: asNumber(record.role_template_id),
      role_template_code: asString(record.role_template_code),
      role_template_name: asString(record.role_template_name),
      school_id: asNumber(record.school_id),
      level_ids: Array.isArray(record.level_ids)
        ? record.level_ids.filter((id): id is number => typeof id === 'number')
        : [],
      class_ids: Array.isArray(record.class_ids)
        ? record.class_ids.filter((id): id is number => typeof id === 'number')
        : [],
      capabilities: asStringArray(record.capabilities),
    });
  }
  return scopes;
}

export function normalizeEffectivePermissionsPayload(
  raw: unknown,
): StaffEffectivePermissionsPayload | null {
  const record = asRecord(raw);
  if (!record) return null;
  return {
    user_id: asNumber(record.user_id) ?? undefined,
    school_id: asNumber(record.school_id) ?? undefined,
    admin_kind: asString(record.admin_kind) ?? undefined,
    permissions_mode:
      typeof record.permissions_mode === 'string'
        ? (record.permissions_mode as PermissionsMode)
        : undefined,
    assigned_capabilities: asStringArray(record.assigned_capabilities),
    effective_capabilities: asStringArray(record.effective_capabilities),
    effective_permissions: asStringArray(record.effective_permissions),
    warnings: normalizeStaffWarnings(record.warnings),
  };
}

export function normalizeStaffCenterMember(raw: StaffMember): StaffMember {
  const base = normalizeStaffMember(raw);
  const displayName = asString(raw.display_name) ?? base.name;
  const nestedPermissions = normalizeEffectivePermissionsPayload(
    typeof raw.effective_permissions === 'object' && raw.effective_permissions != null
      ? raw.effective_permissions
      : null,
  );

  return {
    ...base,
    name: displayName,
    display_name: displayName,
    mobile: asString(raw.mobile) ?? base.phone,
    phone: base.phone ?? asString(raw.mobile),
    partner_id: asNumber(raw.partner_id),
    status: asString(raw.status) ?? base.account_status,
    is_admin_staff: asBool(raw.is_admin_staff),
    is_teacher: asBool(raw.is_teacher),
    teacher_id: asNumber(raw.teacher_id),
    teacher_type: asString(raw.teacher_type),
    primary_school_id: asNumber(raw.primary_school_id),
    role_templates: Array.isArray(raw.role_templates) ? raw.role_templates : undefined,
    scopes: normalizeScopes(raw.scopes),
    teacher: normalizeTeacherLink(raw.teacher),
    warnings: normalizeStaffWarnings(raw.warnings),
    allowed_actions: normalizeStaffAllowedActions(raw.allowed_actions),
    assigned_capabilities:
      nestedPermissions?.assigned_capabilities ??
      asStringArray(raw.assigned_capabilities) ??
      base.assigned_capabilities,
    effective_capabilities:
      nestedPermissions?.effective_capabilities ?? asStringArray(raw.effective_capabilities),
    effective_permissions:
      nestedPermissions?.effective_permissions ??
      (Array.isArray(raw.effective_permissions)
        ? asStringArray(raw.effective_permissions)
        : base.effective_permissions),
  };
}

export function resolveStaffUserId(member: StaffMember): number {
  return member.user_id ?? member.id;
}

export function resolveStaffDisplayName(member: StaffMember): string {
  return member.display_name?.trim() || member.name?.trim() || '—';
}

export function resolveStaffPrimarySchoolName(member: StaffMember): string | null {
  if (member.default_school?.name) return member.default_school.name;
  if (member.primary_school_id != null) {
    const match = member.schools?.find((school) => school.id === member.primary_school_id);
    if (match?.name) return match.name;
  }
  return member.schools?.[0]?.name ?? null;
}

export function unwrapStaffDetailResponse(data: StaffDetailEnvelope | StaffMember): {
  member: StaffMember;
  permissionsPayload: StaffEffectivePermissionsPayload | null;
} {
  const record = asRecord(data);
  const item = record?.item;
  const memberRaw = (item && typeof item === 'object' ? item : data) as StaffMember;
  const member = normalizeStaffCenterMember(memberRaw);

  const envelopePermissions = normalizeEffectivePermissionsPayload(record?.effective_permissions);
  const inlinePermissions = normalizeEffectivePermissionsPayload(
    typeof memberRaw.effective_permissions === 'object' &&
      memberRaw.effective_permissions != null &&
      !Array.isArray(memberRaw.effective_permissions)
      ? memberRaw.effective_permissions
      : null,
  );

  const permissionsPayload = envelopePermissions ?? inlinePermissions;
  if (permissionsPayload && !member.warnings?.length && permissionsPayload.warnings?.length) {
    member.warnings = permissionsPayload.warnings;
  }

  return { member, permissionsPayload };
}

export function mergeStaffPermissionsPayload(
  member: StaffMember,
  payload: StaffEffectivePermissionsPayload | null,
): StaffMember {
  if (!payload) return member;
  return {
    ...member,
    admin_kind: (payload.admin_kind as StaffMember['admin_kind']) ?? member.admin_kind,
    permissions_mode: payload.permissions_mode ?? member.permissions_mode,
    assigned_capabilities: payload.assigned_capabilities?.length
      ? payload.assigned_capabilities
      : member.assigned_capabilities,
    effective_capabilities: payload.effective_capabilities?.length
      ? payload.effective_capabilities
      : member.effective_capabilities,
    effective_permissions: payload.effective_permissions?.length
      ? payload.effective_permissions
      : member.effective_permissions,
    warnings: member.warnings?.length ? member.warnings : payload.warnings,
  };
}

export function staffUserTypeLabelKeys(member: StaffMember): string[] {
  const keys: string[] = [];
  if (member.is_admin_staff) keys.push('admin.staffCenter.userType.admin');
  if (member.is_teacher) keys.push('admin.staffCenter.userType.teacher');
  if (!keys.length) {
    if (member.admin_kind) keys.push('admin.staffCenter.userType.admin');
    if (member.teacher_id || member.teacher) keys.push('admin.staffCenter.userType.teacher');
  }
  return keys.length ? keys : ['admin.staffCenter.userType.unknown'];
}
