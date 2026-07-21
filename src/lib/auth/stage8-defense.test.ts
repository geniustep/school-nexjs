import { describe, expect, it } from 'vitest';
import {
  isSchoolAccessSuspended,
  isSchoolAccessSuspendedErrorCode,
} from '@/lib/auth/admin-access-status';
import { hasEffectivePermission } from '@/lib/permissions/effective-permissions';
import { adminAcademicHubLinksForUser } from '@/lib/permissions/admin-pages';
import { hasPermission } from '@/lib/permissions/permissions';
import { resolveOdooDbFallback } from '@/lib/config';
import { bindActiveSchoolJsonBody } from '@/lib/api/bind-active-school-body';
import { assertMutationOrigin } from '@/lib/api/mutation-origin';
import {
  shouldBindActiveSchoolInBody,
  shouldInjectActiveSchoolIdInBody,
} from '@/lib/api/bff-route-policy';
import type { CurrentUser } from '@/types/user';

function admin(partial: Partial<CurrentUser> = {}): CurrentUser {
  return {
    id: 1,
    name: 'مدير تجريبي',
    email: 'admin@example.com',
    role: 'admin',
    permissions: [],
    school: { id: 3, name: 'مدرسة تجريبية' },
    ...partial,
  };
}

describe('F-NX-05/11/13 server permission helpers', () => {
  it('Default DENY for empty/unknown effective capability', () => {
    const user = admin({ effective_permissions: [] });
    expect(hasEffectivePermission(user, 'finance.view')).toBe(false);
    expect(hasPermission(user, 'view_attendance')).toBe(false);
  });

  it('effective deny beats legacy permissions', () => {
    const user = admin({
      permissions: ['view_homeworks'],
      effective_permissions: [],
    });
    expect(hasPermission(user, 'view_homeworks')).toBe(false);
    expect(adminAcademicHubLinksForUser(user)).toEqual([]);
  });

  it('effective allow drives Academic Hub links', () => {
    const user = admin({
      permissions: [],
      effective_permissions: ['view_timetable', 'view_exams'],
    });
    const links = adminAcademicHubLinksForUser(user);
    expect(links.map((l) => l.permission).sort()).toEqual(['view_exams', 'view_timetable']);
  });

  it('school_access_suspended only when Backend flag is true', () => {
    expect(isSchoolAccessSuspended(admin())).toBe(false);
    expect(isSchoolAccessSuspended(admin({ school_access_suspended: true }))).toBe(true);
    expect(isSchoolAccessSuspendedErrorCode('school_access_suspended')).toBe(true);
    expect(isSchoolAccessSuspendedErrorCode('forbidden')).toBe(false);
  });
});

describe('F-NX-06 active school body binding', () => {
  it('rejects mismatched school_id before upstream', () => {
    const result = bindActiveSchoolJsonBody({ school_id: 9, name: 'x' }, 3);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('school_id_mismatch');
  });

  it('rejects mismatched active_school_id', () => {
    const result = bindActiveSchoolJsonBody({ active_school_id: 99 }, 3);
    expect(result.ok).toBe(false);
  });

  it('passes matching ids and injects active_school_id', () => {
    const result = bindActiveSchoolJsonBody({ school_id: 3, note: 'ok' }, 3);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.body).toMatchObject({ school_id: 3, active_school_id: 3, note: 'ok' });
    }
  });

  it('does not bind GET or non-admin paths', () => {
    expect(shouldBindActiveSchoolInBody('/admin/finance/fee-plans', 'GET')).toBe(false);
    expect(shouldBindActiveSchoolInBody('/teacher/classes', 'POST')).toBe(false);
    expect(shouldBindActiveSchoolInBody('/admin/finance/fee-plans', 'POST')).toBe(true);
  });

  it('does not inject active_school_id into finance services catalog body', () => {
    expect(shouldInjectActiveSchoolIdInBody('/admin/finance/services')).toBe(false);
    expect(shouldInjectActiveSchoolIdInBody('/admin/finance/services/4083')).toBe(false);
    expect(shouldInjectActiveSchoolIdInBody('/admin/finance/fee-plans')).toBe(true);
  });

  it('does not inject active_school_id into student guardian relationship bodies', () => {
    expect(
      shouldInjectActiveSchoolIdInBody('/admin/students/6855/guardians/3199/update'),
    ).toBe(false);
    expect(
      shouldInjectActiveSchoolIdInBody('/admin/students/2081/guardians/link-person'),
    ).toBe(false);
    expect(shouldInjectActiveSchoolIdInBody('/admin/students/2081/guardians')).toBe(false);
    expect(shouldInjectActiveSchoolIdInBody('/admin/students/2081')).toBe(true);
  });

  it('does not inject active_school_id into subject enablement update body', () => {
    expect(shouldInjectActiveSchoolIdInBody('/admin/subjects/enablement/update')).toBe(false);
    expect(shouldInjectActiveSchoolIdInBody('/admin/subjects/enable')).toBe(true);
  });
});

describe('F-NX-12 mutation origin', () => {
  it('allows same-origin POST and ignores GET', () => {
    const req = new Request('https://school.raqeem.ma/api/odoo/admin/students', {
      method: 'POST',
      headers: {
        host: 'school.raqeem.ma',
        origin: 'https://school.raqeem.ma',
      },
    });
    expect(assertMutationOrigin(req).ok).toBe(true);

    const getReq = new Request('https://evil.example/x', {
      method: 'GET',
      headers: { host: 'school.raqeem.ma', origin: 'https://evil.example' },
    });
    expect(assertMutationOrigin(getReq).ok).toBe(true);
  });

  it('rejects cross-origin and malformed Origin', () => {
    const cross = new Request('https://school.raqeem.ma/api/odoo/admin/students', {
      method: 'POST',
      headers: {
        host: 'school.raqeem.ma',
        origin: 'https://evil.example',
      },
    });
    expect(assertMutationOrigin(cross).ok).toBe(false);

    const bad = new Request('https://school.raqeem.ma/api/odoo/admin/students', {
      method: 'DELETE',
      headers: {
        host: 'school.raqeem.ma',
        origin: 'not-a-url',
      },
    });
    expect(assertMutationOrigin(bad).ok).toBe(false);
  });

  it('allows missing Origin (SameSite defense remains)', () => {
    const req = new Request('http://localhost:3000/api/odoo/admin/students', {
      method: 'POST',
      headers: { host: 'localhost:3000' },
    });
    expect(assertMutationOrigin(req).ok).toBe(true);
  });
});

describe('F-NX-08 ODOO_DB default', () => {
  it('defaults to school in development/test and never alwah', () => {
    expect(resolveOdooDbFallback(undefined, 'development')).toBe('school');
    expect(resolveOdooDbFallback(undefined, 'test')).toBe('school');
    expect(resolveOdooDbFallback(undefined, 'development')).not.toBe('alwah');
  });

  it('preserves explicit env and fail-safes production', () => {
    expect(resolveOdooDbFallback('custom-db', 'development')).toBe('custom-db');
    expect(resolveOdooDbFallback(undefined, 'production')).toBe('');
    expect(resolveOdooDbFallback('school', 'production')).toBe('school');
  });
});
