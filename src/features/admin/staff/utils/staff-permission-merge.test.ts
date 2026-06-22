import { describe, expect, it } from 'vitest';
import type { StaffCapabilityOption, StaffMember, StaffScope } from '@/types/academic-setup';
import {
  buildScopeCapabilityUpdates,
  buildStaffPermissionSavePayload,
  capabilityIdsToCodes,
  payloadUsesRoleTemplateOnly,
  resolveStoredCapabilityCodes,
  responseIncludesCapabilityCodes,
} from './staff-permission-merge';

const CATALOG: StaffCapabilityOption[] = [
  { id: 1, code: 'view_homeworks', category: 'academics', label: 'Homework', grantable: true },
  { id: 2, code: 'view_dashboard', category: 'dashboard', label: 'Dashboard', grantable: true },
  { id: 3, code: 'view_channels', category: 'communication', label: 'Channels', grantable: true },
  { id: 4, code: 'send_messages', category: 'communication', label: 'Send', grantable: true },
];

function baseMember(partial: Partial<StaffMember> = {}): StaffMember {
  return {
    id: 4706,
    name: 'Teacher',
    email: 'teacher@test.ma',
    phone: null,
    job_title: null,
    admin_kind: 'admin_staff',
    permissions_mode: 'assigned',
    capabilities_editable: true,
    active: true,
    account_status: 'active',
    schools: [{ id: 3, name: 'School' }],
    default_school: { id: 3, name: 'School' },
    permissions: [],
    teacher_id: 1306,
    is_teacher: true,
    creation_template_code: 'subject_teacher',
    scopes: [
      {
        school_id: 3,
        scope_type: 'classes',
        class_ids: [2058],
        capability_codes: ['view_homeworks', 'view_attendance'],
      },
    ],
    ...partial,
  };
}

describe('resolveStoredCapabilityCodes', () => {
  it('reads persisted codes from scopes before template defaults', () => {
    const member = baseMember({
      creation_template_code: 'subject_teacher',
      permissions: ['view_dashboard'],
      capabilities: ['view_dashboard'],
    });

    expect(resolveStoredCapabilityCodes(member)).toEqual([
      'view_homeworks',
      'view_attendance',
    ]);
  });

  it('falls back to assigned_capabilities when scopes are empty', () => {
    const member = baseMember({
      scopes: [],
      assigned_capabilities: ['view_channels'],
    });

    expect(resolveStoredCapabilityCodes(member)).toEqual(['view_channels']);
  });
});

describe('buildScopeCapabilityUpdates', () => {
  it('builds merge payload for added capabilities', () => {
    const scopes: StaffScope[] = [
      {
        school_id: 3,
        scope_type: 'classes',
        class_ids: [2058],
        capability_codes: ['view_homeworks'],
      },
    ];

    expect(buildScopeCapabilityUpdates(scopes, ['view_dashboard', 'view_channels'], [])).toEqual([
      {
        school_id: 3,
        scope_type: 'classes',
        class_ids: [2058],
        capability_codes: ['view_dashboard', 'view_channels'],
      },
    ]);
  });

  it('builds merge payload for removed capabilities', () => {
    const scopes: StaffScope[] = [
      {
        school_id: 3,
        scope_type: 'classes',
        class_ids: [2058],
        capability_codes: ['view_homeworks', 'send_messages'],
      },
    ];

    expect(buildScopeCapabilityUpdates(scopes, [], ['send_messages'])).toEqual([
      {
        school_id: 3,
        scope_type: 'classes',
        class_ids: [2058],
        remove_capability_codes: ['send_messages'],
      },
    ]);
  });
});

describe('buildStaffPermissionSavePayload', () => {
  it('sends merge payload with scopes when updating capabilities', () => {
    const member = baseMember();
    const result = buildStaffPermissionSavePayload({
      isCreate: false,
      member,
      capabilityIds: [1, 2, 3],
      originalCapabilityIds: [1],
      capabilitiesTouched: true,
      catalog: CATALOG,
      catalogReady: true,
      permissionsMeta: { permissions_mode: 'assigned', capabilities_editable: true },
    });

    expect(result.blockSaveMissingScope).toBe(false);
    expect(result.mergePayload).toEqual({
      capability_update_mode: 'merge',
      scopes: [
        {
          school_id: 3,
          scope_type: 'classes',
          class_ids: [2058],
          capability_codes: ['view_dashboard', 'view_channels'],
        },
      ],
    });
    expect(result.capability_ids).toBeUndefined();
  });

  it('blocks capability update when member has no scopes', () => {
    const result = buildStaffPermissionSavePayload({
      isCreate: false,
      member: baseMember({ scopes: [] }),
      capabilityIds: [2],
      originalCapabilityIds: [1],
      capabilitiesTouched: true,
      catalog: CATALOG,
      catalogReady: true,
      permissionsMeta: { permissions_mode: 'assigned', capabilities_editable: true },
    });

    expect(result.blockSaveMissingScope).toBe(true);
    expect(result.mergePayload).toBeUndefined();
    expect(result.capabilityChangesAttempted).toBe(true);
  });

  it('does not send role_template_code-only payload for permission updates', () => {
    expect(payloadUsesRoleTemplateOnly({ role_template_code: 'subject_teacher' })).toBe(true);
    expect(
      payloadUsesRoleTemplateOnly({
        capability_update_mode: 'merge',
        scopes: [{ capability_codes: ['view_dashboard'] }],
      }),
    ).toBe(false);
  });

  it('keeps create flow on capability_ids', () => {
    const result = buildStaffPermissionSavePayload({
      isCreate: true,
      member: null,
      capabilityIds: [1, 2],
      originalCapabilityIds: [],
      capabilitiesTouched: true,
      catalog: CATALOG,
      catalogReady: true,
      permissionsMeta: { permissions_mode: 'assigned', capabilities_editable: true },
    });

    expect(result.capability_ids).toEqual([1, 2]);
    expect(result.mergePayload).toBeUndefined();
  });
});

describe('responseIncludesCapabilityCodes', () => {
  it('confirms saved codes from scopes in response', () => {
    const member = baseMember({
      scopes: [
        {
          school_id: 3,
          scope_type: 'classes',
          class_ids: [2058],
          capability_codes: ['view_homeworks', 'view_dashboard', 'view_channels'],
        },
      ],
    });

    expect(
      responseIncludesCapabilityCodes(member, ['view_homeworks', 'view_dashboard', 'view_channels']),
    ).toBe(true);
  });
});

describe('capabilityIdsToCodes', () => {
  it('maps selected ids to capability codes for merge payload', () => {
    expect(capabilityIdsToCodes([1, 2], CATALOG)).toEqual(['view_homeworks', 'view_dashboard']);
  });
});
