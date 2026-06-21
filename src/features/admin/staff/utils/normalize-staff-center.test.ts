import { describe, expect, it } from 'vitest';
import {
  normalizeStaffCenterMember,
  resolveStaffUserId,
  unwrapStaffDetailResponse,
} from '@/features/admin/staff/utils/normalize-staff-center';
import type { StaffMember } from '@/types/academic-setup';

function baseMember(partial: Partial<StaffMember> = {}): StaffMember {
  return {
    id: 10,
    name: 'Legacy Name',
    email: 'staff@example.com',
    phone: null,
    job_title: null,
    admin_kind: 'admin_staff',
    active: true,
    account_status: 'active',
    schools: [],
    default_school: null,
    permissions: [],
    ...partial,
  };
}

describe('normalizeStaffCenterMember', () => {
  it('prefers display_name and normalizes allowed_actions array', () => {
    const member = normalizeStaffCenterMember(
      baseMember({
        display_name: 'Display Name',
        allowed_actions: ['view', 'view_effective_permissions'],
        warnings: [{ code: 'account_without_scope' }],
      }),
    );

    expect(member.name).toBe('Display Name');
    expect(member.allowed_actions).toEqual(['view', 'view_effective_permissions']);
    expect(member.warnings?.[0]?.code).toBe('account_without_scope');
  });

  it('unwraps detail envelope with effective_permissions payload', () => {
    const parsed = unwrapStaffDetailResponse({
      item: baseMember({
        user_id: 42,
        display_name: 'Detail User',
      }),
      effective_permissions: {
        user_id: 42,
        effective_permissions: ['finance.view'],
        effective_capabilities: ['collect_payments'],
        warnings: [{ code: 'admin_staff_without_capabilities' }],
      },
    });

    expect(resolveStaffUserId(parsed.member)).toBe(42);
    expect(parsed.permissionsPayload?.effective_permissions).toEqual(['finance.view']);
    expect(parsed.permissionsPayload?.effective_capabilities).toEqual(['collect_payments']);
  });
});
