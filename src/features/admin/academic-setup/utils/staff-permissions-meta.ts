import type {
  PermissionsMode,
  RolePermissionMetadata,
  StaffAdminKind,
  StaffMember,
  StaffOptions,
} from '@/types/academic-setup';

export type StaffCapabilityDisplayMode =
  | 'full_school_readonly'
  | 'platform_readonly'
  | 'assigned_editor'
  | 'supervisor_scoped'
  | 'legacy_role_summary';

const LEGACY_ADMIN_KIND_DEFAULTS: Record<StaffAdminKind, RolePermissionMetadata> = {
  school_manager: {
    permissions_mode: 'full_school',
    capabilities_editable: false,
  },
  project_manager: {
    permissions_mode: 'full_platform',
    capabilities_editable: false,
  },
  general_supervisor: {
    permissions_mode: 'scoped',
    capabilities_editable: false,
  },
  admin_staff: {
    permissions_mode: 'assigned',
    capabilities_editable: true,
  },
  pedagogical_director: {
    permissions_mode: 'assigned',
    capabilities_editable: true,
  },
};

export const SCHOOL_MANAGER_PERMISSION_GROUP_COUNT = 9;

export function schoolManagerPermissionGroupKey(index: number): string {
  return `admin.academicSetup.staffCapabilities.schoolManagerPermissionGroups.group${index}`;
}

function mergeMetadata(
  ...sources: Array<RolePermissionMetadata | undefined | null>
): RolePermissionMetadata {
  const out: RolePermissionMetadata = {};
  for (const source of sources) {
    if (!source) continue;
    if (source.permissions_mode != null) out.permissions_mode = source.permissions_mode;
    if (source.capabilities_editable != null) {
      out.capabilities_editable = source.capabilities_editable;
    }
  }
  return out;
}

export function resolveAdminKindMetadata(
  adminKind: StaffAdminKind,
  options?: StaffOptions,
): RolePermissionMetadata {
  const fromAdminKinds = options?.admin_kinds?.find((k) => k.value === adminKind);
  const fromRoleTemplate = options?.role_templates?.find((t) => t.admin_kind === adminKind);
  const legacy = LEGACY_ADMIN_KIND_DEFAULTS[adminKind];

  return mergeMetadata(fromRoleTemplate, fromAdminKinds, legacy);
}

export function resolveStaffPermissionMetadata(input: {
  adminKind: StaffAdminKind;
  member?: StaffMember | null;
  options?: StaffOptions;
  preferMemberMetadata?: boolean;
}): RolePermissionMetadata & { displayMode: StaffCapabilityDisplayMode } {
  const kindMeta = resolveAdminKindMetadata(input.adminKind, input.options);
  const memberMeta: RolePermissionMetadata | undefined =
    input.member && (input.preferMemberMetadata !== false || input.member.admin_kind === input.adminKind)
      ? {
          permissions_mode: input.member.permissions_mode,
          capabilities_editable: input.member.capabilities_editable,
        }
      : undefined;

  const meta = mergeMetadata(memberMeta, kindMeta);
  const displayMode = resolveStaffCapabilityDisplayMode(input.adminKind, meta);

  return { ...meta, displayMode };
}

export function resolveStaffCapabilityDisplayMode(
  adminKind: StaffAdminKind,
  meta: RolePermissionMetadata,
): StaffCapabilityDisplayMode {
  if (meta.permissions_mode === 'full_school') return 'full_school_readonly';
  if (meta.permissions_mode === 'full_platform') return 'platform_readonly';
  if (meta.permissions_mode === 'assigned' && meta.capabilities_editable !== false) {
    return 'assigned_editor';
  }
  if (meta.permissions_mode === 'scoped' || adminKind === 'general_supervisor') {
    return 'supervisor_scoped';
  }
  if (adminKind === 'admin_staff') return 'assigned_editor';
  return 'legacy_role_summary';
}

export function isCapabilitiesEditable(meta: RolePermissionMetadata): boolean {
  if (meta.permissions_mode === 'full_school' || meta.permissions_mode === 'full_platform') {
    return false;
  }
  if (meta.capabilities_editable === false) return false;
  if (meta.permissions_mode === 'assigned') return true;
  return meta.capabilities_editable ?? false;
}

/** Backend-owned roles must never send capability_ids from the form. */
export function shouldOmitCapabilityIds(meta: RolePermissionMetadata): boolean {
  if (meta.permissions_mode === 'full_school' || meta.permissions_mode === 'full_platform') {
    return true;
  }
  return meta.capabilities_editable === false;
}

export function requiresCapabilityCatalogForCreate(meta: RolePermissionMetadata): boolean {
  return meta.permissions_mode === 'assigned' && meta.capabilities_editable !== false;
}

export function resolveRoleChangeWarningKey(
  fromKind: StaffAdminKind,
  toKind: StaffAdminKind,
  options?: StaffOptions,
): string {
  if (fromKind === toKind) {
    return 'admin.academicSetup.staffCapabilities.roleChangeWarning';
  }

  const toMeta = resolveAdminKindMetadata(toKind, options);
  const fromMeta = resolveAdminKindMetadata(fromKind, options);

  if (toMeta.permissions_mode === 'full_school') {
    return 'admin.academicSetup.staffCapabilities.roleChangeToFullSchoolWarning';
  }
  if (
    fromMeta.permissions_mode === 'full_school' &&
    toMeta.permissions_mode === 'assigned'
  ) {
    return 'admin.academicSetup.staffCapabilities.roleChangeFromFullSchoolWarning';
  }
  return 'admin.academicSetup.staffCapabilities.roleChangeWarning';
}
