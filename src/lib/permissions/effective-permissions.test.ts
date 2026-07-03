import { describe, expect, it } from 'vitest';
import { navForUser } from '@/components/navigation/nav-config';
import { canShowAdminNavPermission } from '@/lib/admin/admin-ux';
import { normalizeMeUser } from '@/lib/auth/normalize-user';
import {
  canAccessFinanceDomain,
  hasEffectivePermission,
  resolveEffectiveAdminPermissions,
  resolvePermissionsMode,
} from '@/lib/permissions/effective-permissions';
import {
  canCollectPayments,
  canManageFeeCatalog,
  canManageFeePlans,
  canViewCheques,
  canViewFinance,
  FINANCE_VIEW,
} from '@/lib/permissions/finance';
import { hasPermission } from '@/lib/permissions/permissions';
import type { CurrentUser } from '@/types/user';

function manager(overrides: Partial<CurrentUser> = {}): CurrentUser {
  return {
    id: 1,
    name: 'Manager',
    email: 'm@test.ma',
    role: 'admin',
    admin_kind: 'school_manager',
    permissions: [],
    school: { id: 10, name: 'School A' },
    ...overrides,
  };
}

function staff(overrides: Partial<CurrentUser> = {}): CurrentUser {
  return {
    id: 2,
    name: 'Staff',
    email: 's@test.ma',
    role: 'admin',
    admin_kind: 'admin_staff',
    permissions: [],
    school: { id: 10, name: 'School A' },
    ...overrides,
  };
}

describe('resolvePermissionsMode', () => {
  it('uses official permissions_mode over legacy fallback', () => {
    expect(
      resolvePermissionsMode(
        manager({ permissions_mode: 'assigned', admin_kind: 'school_manager' }),
      ),
    ).toBe('assigned');
  });

  it('falls back to full_school for school_manager without metadata', () => {
    expect(resolvePermissionsMode(manager())).toBe('full_school');
  });
});

describe('full_school finance permissions', () => {
  const user = manager();

  it('allows finance.view', () => {
    expect(hasEffectivePermission(user, 'finance.view')).toBe(true);
    expect(canViewFinance(user)).toBe(true);
  });

  it('allows finance.collect_payments', () => {
    expect(hasEffectivePermission(user, 'finance.collect_payments')).toBe(true);
    expect(canCollectPayments(user)).toBe(true);
  });

  it('allows finance.manage_fee_catalog', () => {
    expect(hasEffectivePermission(user, 'finance.manage_fee_catalog')).toBe(true);
    expect(canManageFeeCatalog(user)).toBe(true);
  });

  it('allows finance.manage_cheques', () => {
    expect(hasEffectivePermission(user, 'finance.manage_cheques')).toBe(true);
    expect(canViewCheques(user)).toBe(true);
  });

  it('does not allow platform-only finance.manage_settings', () => {
    expect(hasEffectivePermission(user, 'finance.manage_settings')).toBe(false);
  });

  it('does not block manager when assigned capabilities are empty', () => {
    expect(user.permissions).toEqual([]);
    expect(canAccessFinanceDomain(user)).toBe(true);
  });

  it('prefers effective_permissions from backend when present', () => {
    const withBackend = manager({
      permissions_mode: 'full_school',
      effective_permissions: ['finance.view', 'finance.view_payments'],
    });
    expect(hasEffectivePermission(withBackend, 'finance.view_payments')).toBe(true);
    expect(hasEffectivePermission(withBackend, 'finance.manage_fee_catalog')).toBe(false);
  });
});

describe('admin_staff capability gating', () => {
  it('blocks admin_staff without finance capabilities', () => {
    const user = staff({ permissions_mode: 'assigned' });
    expect(canViewFinance(user)).toBe(false);
    expect(canCollectPayments(user)).toBe(false);
  });

  it('allows view-only staff without manage actions', () => {
    const user = staff({
      permissions_mode: 'assigned',
      permissions: ['finance.view', 'finance.view_payments'],
    });
    expect(canViewFinance(user)).toBe(true);
    expect(canCollectPayments(user)).toBe(false);
    expect(canManageFeeCatalog(user)).toBe(false);
    expect(canManageFeePlans(user)).toBe(false);
  });
});

describe('active school recalculation via normalization', () => {
  it('preserves permissions metadata after normalizeMeUser', () => {
    const raw = manager({
      permissions_mode: 'full_school',
      capabilities_editable: false,
      effective_permissions: ['finance.view'],
      schools: [{ id: 10, name: 'School A' }, { id: 20, name: 'School B' }],
      school_ids: [10, 20],
      active_school_id: 20,
    });

    const normalized = normalizeMeUser(raw);
    expect(normalized.permissions_mode).toBe('full_school');
    expect(normalized.capabilities_editable).toBe(false);
    expect(normalized.effective_permissions).toEqual(['finance.view']);
    expect(normalized.active_school_id).toBe(20);
  });

  it('recomputes effective grants when active school changes in session payload', () => {
    const schoolA = manager({
      effective_permissions: ['finance.view'],
      active_school_id: 10,
    });
    const schoolB = manager({
      effective_permissions: ['finance.view', 'finance.collect_payments'],
      active_school_id: 20,
    });

    expect(resolveEffectiveAdminPermissions(schoolA).has('finance.collect_payments')).toBe(false);
    expect(resolveEffectiveAdminPermissions(schoolB).has('finance.collect_payments')).toBe(true);
  });
});

describe('navigation finance access', () => {
  const user = manager();

  it('enables finance sidebar item for school manager', () => {
    expect(canShowAdminNavPermission(user, FINANCE_VIEW)).toBe(true);
  });

  it('includes finance section in desktop nav', () => {
    const sections = navForUser(user);
    const financeSection = sections.find((s) =>
      s.items.some((item) => item.href === '/admin/finance'),
    );
    expect(financeSection).toBeTruthy();
  });

  it('allows direct finance route permission check', () => {
    expect(hasPermission(user, FINANCE_VIEW)).toBe(true);
  });

  it('shows finance hub setup links for manager', () => {
    expect(canManageFeeCatalog(user)).toBe(true);
    expect(canManageFeePlans(user)).toBe(true);
  });

  it('does not expose platform finance settings permission', () => {
    expect(hasPermission(user, 'finance.manage_settings')).toBe(false);
  });
});

describe('session normalization contract', () => {
  it('keeps permissions_mode through BFF normalize path', () => {
    const normalized = normalizeMeUser(
      manager({ permissions_mode: 'full_school', capabilities_editable: false }),
    );
    expect(normalized.permissions_mode).toBe('full_school');
    expect(normalized.capabilities_editable).toBe(false);
  });

  it('keeps effective_permissions through normalize path', () => {
    const normalized = normalizeMeUser(
      manager({ effective_permissions: ['finance.view', 'finance.view_cheques'] }),
    );
    expect(normalized.effective_permissions).toEqual(['finance.view', 'finance.view_cheques']);
  });

  it('does not strip permissions metadata fields', () => {
    const normalized = normalizeMeUser(
      manager({
        permissions_mode: 'assigned',
        capabilities_editable: true,
        effective_permissions: ['finance.view'],
      }),
    );
    expect(normalized.permissions_mode).toBe('assigned');
    expect(normalized.capabilities_editable).toBe(true);
    expect(normalized.effective_permissions).toEqual(['finance.view']);
  });
});

describe('finance page-level permission matrix', () => {
  const user = manager();

  it('allows overview', () => {
    expect(hasPermission(user, 'finance.view')).toBe(true);
  });

  it('allows collections', () => {
    expect(hasPermission(user, 'finance.view_payments')).toBe(true);
  });

  it('allows fees catalog', () => {
    expect(hasPermission(user, 'finance.manage_fee_catalog')).toBe(true);
  });

  it('allows cheques', () => {
    expect(hasPermission(user, 'finance.view_cheques')).toBe(true);
  });

  it('allows student balance', () => {
    expect(hasPermission(user, 'finance.view_student_balance')).toBe(true);
  });

  it('allows finance reports via view permission family', () => {
    expect(hasPermission(user, 'finance.view')).toBe(true);
  });
});

const PEDAGOGICAL_ACADEMIC_PERMISSIONS = [
  'view_teachers',
  'view_classes',
  'view_timetable',
  'view_exam_results',
  'view_attendance',
  'view_reports',
] as const;

function pedagogicalDirector(overrides: Partial<CurrentUser> = {}): CurrentUser {
  return {
    id: 3,
    name: 'Pedagogical Director',
    email: 'pd@test.ma',
    role: 'admin',
    admin_kind: 'pedagogical_director',
    permissions_mode: 'scoped',
    capabilities_editable: true,
    permissions: [...PEDAGOGICAL_ACADEMIC_PERMISSIONS],
    effective_capabilities: [...PEDAGOGICAL_ACADEMIC_PERMISSIONS, 'exam.results.publish_limited'],
    school: { id: 10, name: 'School A' },
    school_ids: [10],
    ...overrides,
  };
}

describe('pedagogical_director RBAC', () => {
  const user = pedagogicalDirector();

  it('normalizes without breaking metadata', () => {
    const normalized = normalizeMeUser(user);
    expect(normalized.admin_kind).toBe('pedagogical_director');
    expect(normalized.permissions_mode).toBe('scoped');
    expect(normalized.capabilities_editable).toBe(true);
    expect(normalized.effective_capabilities).toContain('exam.results.publish_limited');
    expect(normalized.permissions).toEqual([...PEDAGOGICAL_ACADEMIC_PERMISSIONS]);
  });

  it('resolves scoped permissions_mode from admin_kind fallback', () => {
    expect(resolvePermissionsMode(user)).toBe('scoped');
  });

  it('does not infer finance permissions from scoped mode', () => {
    expect(canViewFinance(user)).toBe(false);
    expect(canCollectPayments(user)).toBe(false);
    expect(canManageFeeCatalog(user)).toBe(false);
    expect(canViewCheques(user)).toBe(false);
    expect(canAccessFinanceDomain(user)).toBe(false);
    expect(hasPermission(user, 'finance.view_cash_sessions')).toBe(false);
  });

  it('allows academic navigation items from effective permissions', () => {
    expect(canShowAdminNavPermission(user, 'view_teachers')).toBe(true);
    expect(canShowAdminNavPermission(user, 'view_classes')).toBe(true);
    expect(canShowAdminNavPermission(user, 'view_timetable')).toBe(true);
    expect(canShowAdminNavPermission(user, 'view_exam_results')).toBe(true);
    expect(canShowAdminNavPermission(user, 'view_attendance')).toBe(true);
    expect(canShowAdminNavPermission(user, FINANCE_VIEW)).toBe(false);
    expect(canShowAdminNavPermission(user, 'view_students')).toBe(false);
    expect(canShowAdminNavPermission(user, 'view_parents')).toBe(false);
  });

  it('builds academic nav without finance section', () => {
    const sections = navForUser(user);
    const hrefs = sections.flatMap((s) => s.items.map((i) => i.href));
    expect(hrefs).toContain('/admin/teachers');
    expect(hrefs).toContain('/admin/classes');
    expect(hrefs).toContain('/admin/timetable');
    expect(hrefs).toContain('/admin/exam-results');
    expect(hrefs).toContain('/admin/attendance?date=today');
    expect(hrefs.some((h) => h.startsWith('/admin/finance'))).toBe(false);
    expect(hrefs.some((h) => h.startsWith('/admin/students'))).toBe(false);
  });

  it('keeps school_manager finance access unchanged', () => {
    const managerUser = manager();
    expect(canViewFinance(managerUser)).toBe(true);
    expect(canShowAdminNavPermission(managerUser, FINANCE_VIEW)).toBe(true);
  });
});
