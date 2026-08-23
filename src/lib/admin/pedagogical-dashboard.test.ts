import { describe, expect, it } from 'vitest';
import ar from '../../../messages/ar.json';
import en from '../../../messages/en.json';
import { navForUser } from '@/components/navigation/nav-config';
import { useScopedNavLabels } from '@/lib/admin/admin-ux';
import { resolveDashboardContextPresentation, resolveDashboardVariant } from '@/lib/admin/dashboard-registry';
import {
  PEDAGOGICAL_NAV_GROUP_IDS,
  resolvePedagogicalDashboardActions,
  resolvePedagogicalDashboardMetricGroups,
  resolvePedagogicalDashboardMetrics,
  shouldUsePedagogicalDashboard,
} from '@/lib/admin/pedagogical-dashboard';
import type { CurrentUser } from '@/types/user';

const FORBIDDEN_AR = [
  'محدود',
  'غير متاح',
  'مخفية',
  'بسبب نطاقك',
  'بسبب صلاحياتك',
  'صلاحيات غير ممنوحة',
  'مشرف بنطاق محدود',
];

const FULL_ACADEMIC_PERMISSIONS = [
  'view_dashboard',
  'admission.view',
  'view_students',
  'view_parents',
  'view_teachers',
  'view_classes',
  'view_attendance',
  'view_timetable',
  'view_homeworks',
  'view_resources',
  'view_exams',
  'view_exam_results',
  'view_channels',
  'view_reports',
] as const;

function admin(overrides: Partial<CurrentUser> = {}): CurrentUser {
  return {
    id: 1,
    name: 'Admin',
    email: 'a@test.ma',
    role: 'admin',
    permissions: [],
    school: { id: 10, name: 'School A' },
    ...overrides,
  };
}

function readMessage(messages: Record<string, unknown>, key: string): string {
  const value = key.split('.').reduce<unknown>((node, part) => {
    if (node && typeof node === 'object' && part in (node as Record<string, unknown>)) {
      return (node as Record<string, unknown>)[part];
    }
    return undefined;
  }, messages);
  return typeof value === 'string' ? value : '';
}

function collectPedagogicalCopyKeys(messages: Record<string, unknown>, prefix: string): string[] {
  const root = prefix.split('.').reduce<unknown>((node, part) => {
    if (node && typeof node === 'object' && part in (node as Record<string, unknown>)) {
      return (node as Record<string, unknown>)[part];
    }
    return undefined;
  }, messages);

  if (!root || typeof root !== 'object') return [];

  const keys: string[] = [];
  const walk = (node: Record<string, unknown>, path: string) => {
    for (const [key, value] of Object.entries(node)) {
      const next = `${path}.${key}`;
      if (typeof value === 'string') keys.push(next);
      else if (value && typeof value === 'object') walk(value as Record<string, unknown>, next);
    }
  };
  walk(root as Record<string, unknown>, prefix);
  return keys;
}

describe('pedagogical director sidebar', () => {
  const user = admin({
    admin_kind: 'pedagogical_director',
    permissions: [...FULL_ACADEMIC_PERMISSIONS],
  });

  it('shows wide academic nav groups with neutral titles', () => {
    expect(useScopedNavLabels(user)).toBe(false);

    const sections = navForUser(user);
    const groupIds = sections.map((section) => section.groupId).filter(Boolean);

    expect(groupIds).toEqual(expect.arrayContaining([...PEDAGOGICAL_NAV_GROUP_IDS]));
    expect(sections.every((section) => !(section.titleKey ?? '').includes('adminScoped'))).toBe(
      true,
    );
  });

  it('matches the school-specific academic section terminology when full permissions are granted', () => {
    const actual = navForUser(user).filter((section) =>
      PEDAGOGICAL_NAV_GROUP_IDS.includes(section.groupId as (typeof PEDAGOGICAL_NAV_GROUP_IDS)[number]),
    );

    expect(actual.map((section) => section.groupId)).toEqual([
      'ops',
      'students',
      'staff',
      'academic',
      'learning',
      'communication',
    ]);
    expect(actual.map((section) => section.titleKey)).toEqual([
      'nav.schoolLife',
      'nav.registrationSchooling',
      'nav.adminSchoolStaff',
      'nav.pedagogicalOrganization',
      'nav.teachingAssessment',
      'nav.communication',
    ]);
  });

  it('always shows dashboard link for pedagogical director', () => {
    const limited = admin({
      admin_kind: 'pedagogical_director',
      permissions: ['view_teachers'],
    });
    const ops = navForUser(limited).find((section) => section.groupId === 'ops');
    expect(ops?.items.some((item) => item.href === '/admin/dashboard')).toBe(true);
  });

  it('shows school team with teachers permission even without view_classes', () => {
    const userTeachersOnly = admin({
      admin_kind: 'pedagogical_director',
      permissions: ['view_teachers', 'view_dashboard'],
    });
    const staff = navForUser(userTeachersOnly).find((section) => section.groupId === 'staff');
    expect(staff?.items.some((item) => item.labelKey === 'nav.schoolTeam')).toBe(true);
  });

  it('keeps finance hidden without finance permissions', () => {
    const financeSection = navForUser(user).find((section) => section.groupId === 'finance');
    expect(financeSection).toBeUndefined();
  });
});

describe('pedagogical dashboard composition', () => {
  const user = admin({
    admin_kind: 'pedagogical_director',
    permissions: [...FULL_ACADEMIC_PERMISSIONS],
  });

  it('shows full academic metric set without finance', () => {
    const metrics = resolvePedagogicalDashboardMetrics(user).map((item) => item.id);
    expect(metrics).toEqual(
      expect.arrayContaining([
        'students',
        'admissions',
        'parents',
        'teachers',
        'staffCenter',
        'classes',
        'attendance',
        'homeworks',
        'examResults',
      ]),
    );
    expect(metrics).not.toContain('finance' as never);
  });

  it('groups metrics into pedagogical sections', () => {
    const groups = resolvePedagogicalDashboardMetricGroups(user);
    expect(groups.map((group) => group.id)).toEqual([
      'schoolLife',
      'academicOrg',
      'learningAssessment',
      'team',
    ]);
    const schoolLife = groups.find((group) => group.id === 'schoolLife');
    expect(schoolLife?.metrics.map((item) => item.id)).toEqual([
      'students',
      'parents',
      'admissions',
      'attendance',
    ]);
    expect(groups.every((group) => group.metrics.length > 0)).toBe(true);
  });

  it('prioritizes primary work-center actions including students', () => {
    const { primary, secondary } = resolvePedagogicalDashboardActions(user);
    expect(primary.map((item) => item.id)).toEqual([
      'attendance',
      'teachers',
      'classes',
      'examResults',
      'timetable',
      'students',
    ]);
    expect(secondary.some((item) => item.id === 'channels')).toBe(true);
    expect(secondary.some((item) => item.id === 'staffCenter')).toBe(true);
    expect(primary.some((item) => item.id === 'students')).toBe(true);
  });

  it('hides unauthorized metrics instead of showing unavailable placeholders', () => {
    const limited = admin({
      admin_kind: 'pedagogical_director',
      permissions: ['view_teachers'],
    });
    const metrics = resolvePedagogicalDashboardMetrics(limited).map((item) => item.id);
    expect(metrics).toEqual(['teachers', 'staffCenter']);
    expect(metrics).not.toContain('attendance');
  });
});

describe('pedagogical dashboard presentation', () => {
  const user = admin({
    admin_kind: 'pedagogical_director',
    permissions: ['view_teachers', 'view_classes', 'view_attendance'],
    scope: {
      type: 'school',
      allowed_level_ids: [],
      allowed_class_ids: [],
      allowed_channel_ids: [],
    },
  });

  it('uses pedagogical_director variant without scoped deficit banners', () => {
    const variant = resolveDashboardVariant(user);
    expect(variant.id).toBe('pedagogical_director');
    expect(variant.showScopedAccessBanner).toBe(false);
    expect(variant.scopedMode).toBe(false);
  });

  it('does not render permission summary context panel', () => {
    expect(resolveDashboardContextPresentation(user)).toBeNull();
  });
});

describe('pedagogical dashboard copy', () => {
  it('avoids deficit language in Arabic pedagogical dashboard strings', () => {
    const keys = collectPedagogicalCopyKeys(ar as Record<string, unknown>, 'admin.pedagogicalDashboard');
    expect(keys.length).toBeGreaterThan(10);
    for (const key of keys) {
      const text = readMessage(ar as Record<string, unknown>, key);
      for (const forbidden of FORBIDDEN_AR) {
        expect(text, `${key} contains "${forbidden}"`).not.toContain(forbidden);
      }
    }
  });

  it('uses contextual empty-state keys per metric', () => {
    const user = admin({
      admin_kind: 'pedagogical_director',
      permissions: ['view_attendance', 'view_homeworks'],
    });
    const metrics = resolvePedagogicalDashboardMetrics(user);
    expect(metrics.find((item) => item.id === 'attendance')?.emptyKey).toBe(
      'admin.pedagogicalDashboard.metricEmpty.attendance',
    );
    expect(metrics.find((item) => item.id === 'attendance')?.hintKey).toBe(
      'admin.pedagogicalDashboard.metricHint.attendance',
    );
    expect(readMessage(en as Record<string, unknown>, 'admin.pedagogicalDashboard.metricEmpty.attendance')).toContain(
      'attendance',
    );
  });
});
