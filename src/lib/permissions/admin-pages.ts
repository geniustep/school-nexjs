import { hasAnyPermission, hasPermission } from '@/lib/permissions/permissions';
import type { CurrentUser } from '@/types/user';
import { FINANCE_VIEW, FINANCE_VIEW_CASH_SESSIONS, FINANCE_VIEW_CHEQUES } from '@/lib/permissions/finance';
import { ADMISSION_VIEW } from '@/lib/permissions/admission';
import { canViewTeachingPlanning } from '@/lib/permissions/teaching-planning';
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
  return (
    hasAnyPermission(user, [...ADMIN_ACADEMIC_HUB_PERMISSIONS]) || canViewTeachingPlanning(user)
  );
}

export type AdminAcademicHubLink = {
  href: string;
  icon: string;
  labelKey:
    | 'nav.homework'
    | 'nav.resources'
    | 'nav.timetable'
    | 'nav.academicCalendars'
    | 'nav.teachingPlanning'
    | 'nav.exams'
    | 'nav.results'
    | 'nav.classes'
    | 'nav.levels'
    | 'nav.subjects';
  permission: Permission | null;
};

export const ADMIN_ACADEMIC_HUB_LINKS: readonly AdminAcademicHubLink[] = [
  { href: '/admin/homeworks', icon: '📝', labelKey: 'nav.homework', permission: 'view_homeworks' },
  { href: '/admin/resources', icon: '📚', labelKey: 'nav.resources', permission: 'view_resources' },
  { href: '/admin/timetable', icon: '📅', labelKey: 'nav.timetable', permission: 'view_timetable' },
  {
    href: '/admin/academic-calendars',
    icon: '🗓️',
    labelKey: 'nav.academicCalendars',
    permission: 'view_timetable',
  },
  {
    href: '/admin/teaching-planning',
    icon: '📘',
    labelKey: 'nav.teachingPlanning',
    permission: null,
  },
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
  return ADMIN_ACADEMIC_HUB_LINKS.filter((link) => {
    if (link.href === '/admin/teaching-planning') return canViewTeachingPlanning(user);
    return link.permission != null && hasPermission(user, link.permission);
  });
}

export const ADMIN_PAGE_PERMISSION: Record<string, Permission> = {
  '/admin/dashboard': 'view_dashboard',
  '/admin/students': 'view_students',
  '/admin/parents': 'view_parents',
  '/admin/teachers': 'view_teachers',
  '/admin/staff': 'view_classes',
  '/admin/classes': 'view_classes',
  '/admin/levels': 'view_classes',
  '/admin/subjects': 'view_classes',
  '/admin/attendance': 'view_attendance',
  '/admin/channels': 'view_channels',
  '/admin/communication': 'view_channels',
  '/admin/homeworks': 'view_homeworks',
  '/admin/resources': 'view_resources',
  '/admin/exams': 'view_exams',
  '/admin/exam-results': 'view_exam_results',
  '/admin/academics/assessment/gradebooks': 'view_exams',
  '/admin/academics/assessment/diagnostic': 'view_exams',
  '/admin/academics/assessment/class-results': 'view_exams',
  '/admin/timetable': 'view_timetable',
  '/admin/academic-calendars': 'view_timetable',
  '/admin/finance': FINANCE_VIEW,
};

export function permissionForAdminPath(pathname: string): Permission | null {
  const base = pathname.split('?')[0];
  if (ADMIN_PAGE_PERMISSION[base]) return ADMIN_PAGE_PERMISSION[base];
  if (base.startsWith('/admin/students')) return 'view_students';
  if (base.startsWith('/admin/admissions')) return ADMISSION_VIEW;
  if (base.startsWith('/admin/parents')) return 'view_parents';
  if (base.startsWith('/admin/teachers')) return 'view_teachers';
  if (base.startsWith('/admin/staff')) return 'view_classes';
  if (
    base.startsWith('/admin/classes') ||
    base.startsWith('/admin/levels') ||
    base.startsWith('/admin/subjects')
  ) {
    return 'view_classes';
  }
  if (base.startsWith('/admin/attendance')) return 'view_attendance';
  if (base.startsWith('/admin/channels')) return 'view_channels';
  if (base.startsWith('/admin/communication')) return 'view_channels';
  if (base.startsWith('/admin/homeworks')) return 'view_homeworks';
  if (base.startsWith('/admin/resources')) return 'view_resources';
  if (base.startsWith('/admin/timetable')) return 'view_timetable';
  if (base.startsWith('/admin/academic-calendars')) return 'view_timetable';
  if (base.startsWith('/admin/exam-results') || /\/admin\/exams\/\d+\/results/.test(base)) {
    return 'view_exam_results';
  }
  if (base.startsWith('/admin/academics/assessment/gradebooks')) return 'view_exams';
  if (base.startsWith('/admin/academics/assessment/diagnostic')) return 'view_exams';
  if (base.startsWith('/admin/academics/assessment/class-results')) return 'view_exams';
  if (base.startsWith('/admin/exams')) return 'view_exams';
  if (base.startsWith('/admin/finance/cheques')) return FINANCE_VIEW_CHEQUES;
  if (base.startsWith('/admin/finance/cash-desk')) return FINANCE_VIEW_CASH_SESSIONS;
  if (base.startsWith('/admin/finance')) return FINANCE_VIEW;
  return null;
}
