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
  StaffUserKind,
} from '@/types/academic-setup';

const KNOWN_ADMIN_USER_KINDS = new Set<string>([
  'legacy_admin',
  'project_manager',
  'school_manager',
  'pedagogical_director',
  'general_supervisor',
  'admin_staff',
  'super_admin',
]);

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
    const capabilityCodes = asStringArray(record.capability_codes);
    const legacyCapabilities = asStringArray(record.capabilities);
    scopes.push({
      role_template_id: asNumber(record.role_template_id),
      role_template_code: asString(record.role_template_code),
      role_template_name: asString(record.role_template_name),
      school_id: asNumber(record.school_id),
      scope_type: asString(record.scope_type),
      level_ids: Array.isArray(record.level_ids)
        ? record.level_ids.filter((id): id is number => typeof id === 'number')
        : [],
      class_ids: Array.isArray(record.class_ids)
        ? record.class_ids.filter((id): id is number => typeof id === 'number')
        : [],
      capability_codes: capabilityCodes.length ? capabilityCodes : legacyCapabilities,
      capabilities: legacyCapabilities.length ? legacyCapabilities : capabilityCodes,
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

function normalizeStaffUserKind(raw: unknown): StaffUserKind | null {
  return asString(raw) as StaffUserKind | null;
}

function normalizeNullableAdminKind(
  raw: unknown,
): StaffMember['admin_kind'] {
  if (raw === null) return null;
  return asString(raw);
}

/** Parent when Backend says so — never inferred from name/login/share. */
export function isStaffCenterParent(
  member: Pick<StaffMember, 'user_kind' | 'is_parent'>,
): boolean {
  if (asString(member.user_kind)?.toLowerCase() === 'parent') return true;
  if (member.user_kind == null && member.is_parent === true) return true;
  return false;
}

type StaffProfessionalEvidenceInput = Pick<
  StaffMember,
  | 'user_kind'
  | 'is_parent'
  | 'is_admin_staff'
  | 'is_teacher'
  | 'teacher_id'
  | 'teacher'
  | 'admin_kind'
>;

/**
 * Professional Staff/Teacher evidence from contract fields only.
 * Never treats `role_display_name`, login, or account presence as Staff.
 * `admin_kind` alone does not count when the row is parent-marked (misleading Backend flag).
 */
export function hasStaffCenterProfessionalEvidence(
  member: StaffProfessionalEvidenceInput,
): boolean {
  const kind = asString(member.user_kind)?.toLowerCase() ?? null;
  if (kind === 'teacher') return true;
  if (kind && KNOWN_ADMIN_USER_KINDS.has(kind)) return true;
  if (member.is_teacher === true) return true;
  if (member.is_admin_staff === true) return true;
  if (typeof member.teacher_id === 'number' && Number.isFinite(member.teacher_id)) return true;
  if (member.teacher != null && asNumber(asRecord(member.teacher)?.id) != null) return true;

  const parentMarked = kind === 'parent' || member.is_parent === true;
  if (!parentMarked && asString(member.admin_kind)) return true;
  return false;
}

/** Parent with no professional Staff/Teacher evidence. */
export function isStaffCenterParentOnly(
  member: StaffProfessionalEvidenceInput,
): boolean {
  return isStaffCenterParent(member) && !hasStaffCenterProfessionalEvidence(member);
}

/**
 * Rows eligible for `/admin/staff` list.
 * The staff endpoint is authoritative for non-parent rows and may return a compact
 * teacher payload without explicit professional flags. Exclude only confirmed
 * parent-only rows here; broader eligibility belongs to the Backend contract.
 */
export function isStaffCenterListEligible(
  member: StaffProfessionalEvidenceInput,
): boolean {
  return !isStaffCenterParentOnly(member);
}

export function resolveStaffUserId(member: StaffMember): number {
  return member.user_id ?? member.id;
}

/** Stable unique list rows after confirmed parent-only exclusion. */
export function filterStaffCenterListMembers(members: StaffMember[]): StaffMember[] {
  const seen = new Set<number>();
  const out: StaffMember[] = [];
  for (const member of members) {
    if (!isStaffCenterListEligible(member)) continue;
    const id = resolveStaffUserId(member);
    if (!Number.isFinite(id) || seen.has(id)) continue;
    seen.add(id);
    out.push(member);
  }
  return out;
}

/**
 * Resolve canonical staff user kind for presentation.
 * Precedence: user_kind → is_parent fallback → null (caller uses legacy flags).
 */
export function resolveStaffCenterUserKind(
  member: Pick<StaffMember, 'user_kind' | 'is_parent'>,
): StaffUserKind | null {
  const kind = asString(member.user_kind)?.toLowerCase() ?? null;
  if (kind) return kind as StaffUserKind;
  if (member.is_parent === true) return 'parent';
  return null;
}

export function normalizeStaffCenterMember(raw: StaffMember): StaffMember {
  const base = normalizeStaffMember(raw);
  const displayName = asString(raw.display_name) ?? base.name;
  const nestedPermissions = normalizeEffectivePermissionsPayload(
    typeof raw.effective_permissions === 'object' && raw.effective_permissions != null
      ? raw.effective_permissions
      : null,
  );
  const userKind = normalizeStaffUserKind(raw.user_kind);
  const isParent =
    asBool(raw.is_parent) ?? (userKind?.toLowerCase() === 'parent' ? true : undefined);
  // Preserve explicit null from Backend; do not coerce null → legacy/default via `??`.
  const adminKind =
    raw.admin_kind === null ? null : normalizeNullableAdminKind(raw.admin_kind) ?? base.admin_kind;
  const rawTeacherId = asNumber(raw.teacher_id);
  const rawIsTeacher = asBool(raw.is_teacher);
  const rawIsAdminStaff = asBool(raw.is_admin_staff);
  const hasProfessional = hasStaffCenterProfessionalEvidence({
    user_kind: userKind,
    is_parent: isParent,
    is_admin_staff: rawIsAdminStaff,
    is_teacher: rawIsTeacher,
    teacher_id: rawTeacherId,
    teacher: raw.teacher,
    admin_kind: adminKind,
  });
  // Strip misleading admin/teacher flags only for parent-only rows.
  const isParentOnly =
    (userKind?.toLowerCase() === 'parent' || isParent === true) && !hasProfessional;

  return {
    ...base,
    name: displayName,
    display_name: displayName,
    mobile: asString(raw.mobile) ?? base.phone,
    phone: base.phone ?? asString(raw.mobile),
    partner_id: asNumber(raw.partner_id),
    status: asString(raw.status) ?? base.account_status,
    user_kind: userKind,
    is_parent: isParent,
    admin_kind: isParentOnly ? null : adminKind,
    is_admin_staff: isParentOnly ? false : rawIsAdminStaff,
    is_teacher: isParentOnly ? false : rawIsTeacher,
    teacher_id: isParentOnly ? null : rawTeacherId,
    teacher_type: isParentOnly ? null : asString(raw.teacher_type),
    creation_template_code: asString(raw.creation_template_code),
    role_display_name: asString(raw.role_display_name),
    primary_school_id: asNumber(raw.primary_school_id),
    role_templates: Array.isArray(raw.role_templates) ? raw.role_templates : undefined,
    scopes: normalizeScopes(raw.scopes),
    teacher: isParentOnly ? null : normalizeTeacherLink(raw.teacher),
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

/**
 * User-type badge keys for the unified staff list.
 * Professional evidence wins over parent marking for multi-role people.
 * Never infer Staff/Teacher from `role_display_name`, name, or login.
 * `admin_kind` alone never wins over parent-only rows.
 */
export function staffUserTypeLabelKeys(member: StaffMember): string[] {
  const kind = resolveStaffCenterUserKind(member);
  const hasProfessional = hasStaffCenterProfessionalEvidence(member);

  if (hasProfessional) {
    if (
      kind === 'teacher' ||
      member.is_teacher === true ||
      typeof member.teacher_id === 'number' ||
      member.teacher != null
    ) {
      return ['admin.staffCenter.userType.teacher'];
    }
    if (kind === 'legacy_admin') {
      return ['roles.adminKind.legacy_admin'];
    }
    if ((kind && KNOWN_ADMIN_USER_KINDS.has(kind)) || member.is_admin_staff || member.admin_kind) {
      return ['admin.staffCenter.userType.admin'];
    }
  }

  if (kind === 'parent' || isStaffCenterParentOnly(member)) {
    return ['admin.staffCenter.userType.parent'];
  }

  if (kind === 'teacher') {
    return ['admin.staffCenter.userType.teacher'];
  }

  if (kind === 'legacy_admin') {
    return ['roles.adminKind.legacy_admin'];
  }

  if (kind && KNOWN_ADMIN_USER_KINDS.has(kind)) {
    return ['admin.staffCenter.userType.admin'];
  }

  // Unknown future user_kind — safe fallback, never admin/teacher by default.
  if (kind) {
    return ['admin.staffCenter.userType.unknown'];
  }

  // Legacy payloads without user_kind / is_parent.
  const keys: string[] = [];
  if (member.is_admin_staff) keys.push('admin.staffCenter.userType.admin');
  if (member.is_teacher) keys.push('admin.staffCenter.userType.teacher');
  if (!keys.length) {
    if (member.admin_kind) keys.push('admin.staffCenter.userType.admin');
    if (member.teacher_id || member.teacher) keys.push('admin.staffCenter.userType.teacher');
  }
  if (!keys.length) {
    if (member.teacher_id || member.teacher || member.is_teacher) {
      keys.push('admin.staffCenter.userType.teacher');
    } else if (member.admin_kind) {
      // Real admin_kind only — null/absent must not become legacy_admin or teacher.
      keys.push('admin.staffCenter.userType.admin');
    } else {
      keys.push('admin.staffCenter.userType.unknown');
    }
  }
  return keys;
}
