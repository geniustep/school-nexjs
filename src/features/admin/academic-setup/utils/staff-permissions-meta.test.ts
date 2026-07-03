import { describe, expect, it } from 'vitest';
import type { StaffMember, StaffOptions } from '@/types/academic-setup';
import {
  isCapabilitiesEditable,
  requiresCapabilityCatalogForCreate,
  resolveAdminKindMetadata,
  resolveRoleChangeWarningKey,
  resolveStaffCapabilityDisplayMode,
  resolveStaffPermissionMetadata,
  shouldOmitCapabilityIds,
} from './staff-permissions-meta';

const options: StaffOptions = {
  admin_kinds: [
    {
      value: 'school_manager',
      label: 'School manager',
      permissions_mode: 'full_school',
      capabilities_editable: false,
    },
    {
      value: 'admin_staff',
      label: 'Admin staff',
      permissions_mode: 'assigned',
      capabilities_editable: true,
    },
    {
      value: 'project_manager',
      label: 'Project manager',
      permissions_mode: 'full_platform',
      capabilities_editable: false,
    },
    {
      value: 'general_supervisor',
      label: 'Supervisor',
      permissions_mode: 'scoped',
      capabilities_editable: false,
    },
    {
      value: 'pedagogical_director',
      label: 'Pedagogical Director',
      permissions_mode: 'scoped',
      capabilities_editable: true,
    },
  ],
  schools: [],
  capabilities: [],
};

const schoolManagerMember: StaffMember = {
  id: 1,
  name: 'Manager',
  email: 'm@test',
  phone: null,
  job_title: null,
  admin_kind: 'school_manager',
  permissions_mode: 'full_school',
  capabilities_editable: false,
  active: true,
  account_status: 'active',
  schools: [],
  default_school: null,
  permissions: [],
};

describe('resolveAdminKindMetadata', () => {
  it('reads permissions_mode from staff options admin_kinds', () => {
    expect(resolveAdminKindMetadata('school_manager', options)).toEqual({
      permissions_mode: 'full_school',
      capabilities_editable: false,
    });
  });

  it('falls back to legacy defaults when options missing', () => {
    expect(resolveAdminKindMetadata('admin_staff')).toEqual({
      permissions_mode: 'assigned',
      capabilities_editable: true,
    });
    expect(resolveAdminKindMetadata('pedagogical_director')).toEqual({
      permissions_mode: 'scoped',
      capabilities_editable: true,
    });
  });
});

describe('resolveStaffPermissionMetadata', () => {
  it('prefers member metadata when editing same role', () => {
    const meta = resolveStaffPermissionMetadata({
      adminKind: 'school_manager',
      member: schoolManagerMember,
      options,
    });
    expect(meta.displayMode).toBe('full_school_readonly');
    expect(meta.permissions_mode).toBe('full_school');
    expect(meta.capabilities_editable).toBe(false);
  });

  it('uses selected admin kind metadata after role change', () => {
    const meta = resolveStaffPermissionMetadata({
      adminKind: 'admin_staff',
      member: schoolManagerMember,
      options,
      preferMemberMetadata: false,
    });
    expect(meta.displayMode).toBe('assigned_editor');
    expect(meta.permissions_mode).toBe('assigned');
    expect(meta.capabilities_editable).toBe(true);
  });
});

describe('resolveStaffCapabilityDisplayMode', () => {
  it('maps backend modes to display modes', () => {
    expect(
      resolveStaffCapabilityDisplayMode('school_manager', {
        permissions_mode: 'full_school',
        capabilities_editable: false,
      }),
    ).toBe('full_school_readonly');
    expect(
      resolveStaffCapabilityDisplayMode('project_manager', {
        permissions_mode: 'full_platform',
        capabilities_editable: false,
      }),
    ).toBe('platform_readonly');
    expect(
      resolveStaffCapabilityDisplayMode('admin_staff', {
        permissions_mode: 'assigned',
        capabilities_editable: true,
      }),
    ).toBe('assigned_editor');
    expect(
      resolveStaffCapabilityDisplayMode('pedagogical_director', {
        permissions_mode: 'scoped',
        capabilities_editable: true,
      }),
    ).toBe('assigned_editor');
  });
});

describe('shouldOmitCapabilityIds', () => {
  it('omits for full_school and non-editable roles', () => {
    expect(
      shouldOmitCapabilityIds({
        permissions_mode: 'full_school',
        capabilities_editable: false,
      }),
    ).toBe(true);
    expect(
      shouldOmitCapabilityIds({
        permissions_mode: 'assigned',
        capabilities_editable: true,
      }),
    ).toBe(false);
  });
});

describe('isCapabilitiesEditable', () => {
  it('returns false for inherited school manager permissions', () => {
    expect(
      isCapabilitiesEditable({
        permissions_mode: 'full_school',
        capabilities_editable: false,
      }),
    ).toBe(false);
  });
});

describe('requiresCapabilityCatalogForCreate', () => {
  it('requires catalog only for assigned editable roles', () => {
    expect(
      requiresCapabilityCatalogForCreate({
        permissions_mode: 'assigned',
        capabilities_editable: true,
      }),
    ).toBe(true);
    expect(
      requiresCapabilityCatalogForCreate({
        permissions_mode: 'full_school',
        capabilities_editable: false,
      }),
    ).toBe(false);
  });
});

describe('resolveRoleChangeWarningKey', () => {
  it('returns specific warnings for full school transitions', () => {
    expect(resolveRoleChangeWarningKey('admin_staff', 'school_manager', options)).toBe(
      'admin.academicSetup.staffCapabilities.roleChangeToFullSchoolWarning',
    );
    expect(resolveRoleChangeWarningKey('school_manager', 'admin_staff', options)).toBe(
      'admin.academicSetup.staffCapabilities.roleChangeFromFullSchoolWarning',
    );
  });
});
