import { describe, expect, it } from 'vitest';
import { endpoints } from '@/lib/api/endpoints';
import {
  buildLinkPartnerPayload,
  normalizeGuardianLinkCandidate,
  normalizeGuardianLinkPartnerResponse,
  resolveGuardianIdFromLinkResponse,
} from './normalize-guardian-link-partner';
import { mapGuardianLinkPartnerError } from './map-guardian-link-partner-error';
import {
  formatExistingPersonRoles,
  parentEmployeeLinkSearchLabels,
} from './parent-employee-link-presentation';

const t = (key: string) => key;

describe('guardian link-partner integration', () => {
  it('registers BFF endpoints for search and link-partner', () => {
    expect(endpoints.admin.guardiansSearch).toBe('/admin/guardians/search');
    expect(endpoints.admin.guardiansLinkPartner).toBe('/admin/guardians/link-partner');
    expect(endpoints.admin.parents).toBe('/admin/parents');
  });

  it('builds link-partner payload without parent create fields', () => {
    expect(
      buildLinkPartnerPayload({
        partnerId: 6658,
        preferredLanguage: 'ar',
        notificationOptIn: false,
      }),
    ).toEqual({
      partner_id: 6658,
      preferred_language: 'ar',
      notification_opt_in: false,
    });
  });

  it('normalizes link-partner response with guardian id for redirect', () => {
    const normalized = normalizeGuardianLinkPartnerResponse({
      guardian: {
        id: 699,
        partner_id: 6660,
        name: 'QA Teacher',
        phone: '0600000000',
        email: 'qa@example.com',
        active: true,
        preferred_language: 'ar',
        notification_opt_in: false,
      },
      person: {
        partner_id: 6660,
        display_name: 'QA Teacher',
        existing_roles: ['teacher', 'guardian'],
        can_link_as_guardian: true,
        guardian_id: 699,
        teacher_id: 1258,
        user_id: 123,
      },
      account: {
        user_id: 123,
        roles_added: ['parent'],
        roles_existing: ['teacher'],
        active_role_changed: false,
      },
    });

    expect(normalized?.guardian.id).toBe(699);
    expect(normalized?.person.existing_roles).toEqual(['teacher', 'guardian']);
    expect(normalized?.account?.active_role_changed).toBe(false);
    expect(resolveGuardianIdFromLinkResponse(normalized)).toBe(699);
  });

  it('normalizes person candidate roles', () => {
    const person = normalizeGuardianLinkCandidate({
      partner_id: 6658,
      display_name: 'Staff',
      existing_roles: ['teacher', 'staff', 'guardian'],
      can_link_as_guardian: true,
    });
    expect(person?.existing_roles).toEqual(['teacher', 'guardian']);
  });

  it('formats existing_roles with translation keys', () => {
    const line = formatExistingPersonRoles(t, ['teacher', 'guardian']);
    expect(line).toContain('admin.parents.employeeLink.roles.teacher');
    expect(line).toContain('admin.parents.employeeLink.roles.guardian');
  });

  it('exposes parent employee link search labels without raw keys in UI', () => {
    const labels = parentEmployeeLinkSearchLabels(t);
    expect(labels.placeholder).toBe('admin.parents.employeeLink.searchPlaceholder');
    expect(labels.linkButton).toBe('admin.parents.employeeLink.linkButton');
    expect(labels.searchError).toBe('admin.parents.employeeLink.errors.searchFailed');
  });

  it('maps link-partner API errors to translated keys', () => {
    expect(mapGuardianLinkPartnerError({ code: 'partner_id_required', message: '' }, t)).toBe(
      'admin.parents.employeeLink.errors.partnerIdRequired',
    );
    expect(mapGuardianLinkPartnerError({ code: 'partner_not_found', message: '' }, t)).toBe(
      'admin.parents.employeeLink.errors.partnerNotFound',
    );
    expect(mapGuardianLinkPartnerError({ code: 'partner_out_of_scope', message: '' }, t)).toBe(
      'admin.parents.employeeLink.errors.partnerOutOfScope',
    );
    expect(mapGuardianLinkPartnerError({ code: 'guardian_link_forbidden', message: '' }, t)).toBe(
      'admin.parents.employeeLink.errors.forbidden',
    );
    expect(mapGuardianLinkPartnerError({ code: 'guardian_link_failed', message: '' }, t)).toBe(
      'admin.parents.employeeLink.errors.linkFailed',
    );
    expect(
      mapGuardianLinkPartnerError({ code: 'user_role_assignment_failed', message: '' }, t),
    ).toBe('admin.parents.employeeLink.errors.userRoleAssignmentFailed');
  });

  it('does not surface raw HTML or traceback errors', () => {
    expect(
      mapGuardianLinkPartnerError({ code: 'unknown', message: '<html>traceback</html>' }, t),
    ).toBe('admin.parents.employeeLink.errors.linkFailed');
  });
});

describe('parent create link mode contract', () => {
  it('link mode uses link-partner endpoint path only', () => {
    const payload = buildLinkPartnerPayload({
      partnerId: 6658,
      preferredLanguage: 'fr',
      notificationOptIn: true,
    });
    expect(payload).not.toHaveProperty('name');
    expect(payload).not.toHaveProperty('phone');
    expect(endpoints.admin.guardiansLinkPartner).not.toBe(endpoints.admin.parents);
  });

  it('redirect target resolves guardian id from response', () => {
    const id = resolveGuardianIdFromLinkResponse({
      guardian: {
        id: 42,
        partner_id: 10,
        name: 'Test',
        active: true,
      },
      person: {
        partner_id: 10,
        display_name: 'Test',
        existing_roles: [],
        can_link_as_guardian: true,
      },
    });
    expect(id).toBe(42);
  });
});
