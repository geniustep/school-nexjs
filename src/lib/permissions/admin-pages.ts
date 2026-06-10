import { hasAnyPermission } from '@/lib/permissions/permissions';
import type { CurrentUser } from '@/types/user';
import { FINANCE_VIEW, FINANCE_VIEW_CHEQUES } from '@/lib/permissions/finance';
import type { Permission } from '@/types/permissions';

/** Any one of these grants access to `/admin/academic` (hub, not a single view_*). */
export const ADMIN_ACADEMIC_HUB_PERMISSIONS: readonly Permission[] = [
  'view_homeworks',
  'view_resources',
  'view_exams',
  'view_exam_results',
  'view_timetable',
  'view_attachments',
  'view_classes',
];

export function isAdminAcademicPath(pathname: string): boolean {
  return pathname.split('?')[0] === '/admin/academic';
}

export function canAccessAdminAcademic(user: CurrentUser | null): boolean {
  return hasAnyPermission(user, [...ADMIN_ACADEMIC_HUB_PERMISSIONS]);
}

export type AdminAcademicHubLink = {
  href: string;
  icon: string;
  labelKey:
    | 'nav.homework'
    | 'nav.resources'
    | 'nav.timetable'
    | 'nav.exams'
    | 'nav.results'
    | 'nav.classes'
    | 'nav.levels'
    | 'nav.subjects';
  permission: Permission;
};

export const ADMIN_ACADEMIC_HUB_LINKS: readonly AdminAcademicHubLink[] = [
  { href: '/admin/homeworks', icon: '📝', labelKey: 'nav.homework', permission: 'view_homeworks' },
  { href: '/admin/resources', icon: '📚', labelKey: 'nav.resources', permission: 'view_resources' },
  { href: '/admin/timetable', icon: '📅', labelKey: 'nav.timetable', permission: 'view_timetable' },
  { href: '/admin/exams', icon: '📋', labelKey: 'nav.exams', permission: 'view_exams' },
  {
    href: '/admin/exam-results',
    icon: '📊',
    labelKey: 'nav.results',
    permission: 'view_exam_results',
  },
  { href: '/admin/classes', icon: '🏫', labelKey: 'nav.classes', permission: 'view_classes' },
  { href: '/admin/levels', icon: '📚', labelKey: 'nav.levels', permission: 'view_classes' },
  { href: '/admin/subjects', icon: '📖', labelKey: 'nav.subjects', permission: 'view_classes' },
];

export function adminAcademicHubLinksForUser(user: CurrentUser | null): AdminAcademicHubLink[] {
  if (!user) return [];
  return ADMIN_ACADEMIC_HUB_LINKS.filter((link) => user.permissions?.includes(link.permission));
}

export const ADMIN_PAGE_PERMISSION: Record<string, Permission> = {
  '/admin/dashboard': 'view_dashboard',
  '/admin/students': 'view_students',
  '/admin/parents': 'view_parents',
  '/admin/teachers': 'view_teachers',
  '/admin/classes': 'view_classes',
  '/admin/levels': 'view_classes',
  '/admin/subjects': 'view_classes',
  '/admin/attendance': 'view_attendance',
  '/admin/channels': 'view_channels',
  '/admin/homeworks': 'view_homeworks',
  '/admin/resources': 'view_resources',
  '/admin/exams': 'view_exams',
  '/admin/exam-results': 'view_exam_results',
  '/admin/timetable': 'view_timetable',
  '/admin/finance': FINANCE_VIEW,
};

export function permissionForAdminPath(pathname: string): Permission | null {
  const base = pathname.split('?')[0];
  if (ADMIN_PAGE_PERMISSION[base]) return ADMIN_PAGE_PERMISSION[base];
  if (base.startsWith('/admin/students')) return 'view_students';
  if (base.startsWith('/admin/parents')) return 'view_parents';
  if (base.startsWith('/admin/teachers')) return 'view_teachers';
  if (
    base.startsWith('/admin/classes') ||
    base.startsWith('/admin/levels') ||
    base.startsWith('/admin/subjects')
  ) {
    return 'view_classes';
  }
  if (base.startsWith('/admin/attendance')) return 'view_attendance';
  if (base.startsWith('/admin/channels')) return 'view_channels';
  if (base.startsWith('/admin/homeworks')) return 'view_homeworks';
  if (base.startsWith('/admin/resources')) return 'view_resources';
  if (base.startsWith('/admin/timetable')) return 'view_timetable';
  if (base.startsWith('/admin/exam-results') || /\/admin\/exams\/\d+\/results/.test(base)) {
    return 'view_exam_results';
  }
  if (base.startsWith('/admin/exams')) return 'view_exams';
  if (base.startsWith('/admin/finance/cheques')) return FINANCE_VIEW_CHEQUES;
  if (base.startsWith('/admin/finance')) return FINANCE_VIEW;
  return null;
}
