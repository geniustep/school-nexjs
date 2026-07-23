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
    // timetable + academic-calendars both key off view_timetable
    expect(links.map((l) => l.href).sort()).toEqual([
      '/admin/academic-calendars',
      '/admin/exams',
      '/admin/timetable',
    ]);
    expect(new Set(links.map((l) => l.permission))).toEqual(
      new Set(['view_exams', 'view_timetable']),
    );
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

  it('does not inject active_school_id into academic term create or PATCH bodies', () => {
    expect(shouldInjectActiveSchoolIdInBody('/admin/academic-years/1/terms')).toBe(false);
    expect(shouldInjectActiveSchoolIdInBody('/admin/academic-years/12/terms/')).toBe(false);
    expect(shouldInjectActiveSchoolIdInBody('/admin/academic-setup/terms/31')).toBe(false);
    expect(shouldInjectActiveSchoolIdInBody('/admin/academic-setup/terms/20')).toBe(false);
    // Nearby paths must keep injection — not over-broad *terms* matching.
    expect(shouldInjectActiveSchoolIdInBody('/admin/academic-years/1/terms/initialize')).toBe(
      true,
    );
    expect(shouldInjectActiveSchoolIdInBody('/admin/academic-setup/terms')).toBe(true);
    expect(shouldInjectActiveSchoolIdInBody('/admin/academic-context/options')).toBe(true);
    expect(shouldBindActiveSchoolInBody('/admin/academic-setup/terms/31', 'PATCH')).toBe(true);
    expect(shouldBindActiveSchoolInBody('/admin/academic-years/1/terms', 'POST')).toBe(true);
  });

  it('preserves academic term create payload keys when injection is skipped', () => {
    const path = '/admin/academic-years/1/terms';
    expect(shouldInjectActiveSchoolIdInBody(path)).toBe(false);
    const original = {
      name: 'QA — Academic Term Create BFF Validation',
      code: 'qa_tv_001',
      date_start: '2027-10-05',
      date_end: '2027-10-20',
      state: 'draft',
    };
    const bound = bindActiveSchoolJsonBody(original, 3, {
      injectActiveSchoolId: shouldInjectActiveSchoolIdInBody(path),
    });
    expect(bound.ok).toBe(true);
    if (!bound.ok) return;
    expect(bound.body).toEqual(original);
    expect(bound.body).not.toHaveProperty('active_school_id');
  });

  it('still injects active_school_id for a school-scoped admin mutation that needs it', () => {
    const path = '/admin/finance/fee-plans';
    expect(shouldInjectActiveSchoolIdInBody(path)).toBe(true);
    const bound = bindActiveSchoolJsonBody({ name: 'Plan' }, 3, {
      injectActiveSchoolId: shouldInjectActiveSchoolIdInBody(path),
    });
    expect(bound.ok).toBe(true);
    if (!bound.ok) return;
    expect(bound.body).toMatchObject({ name: 'Plan', active_school_id: 3 });
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
