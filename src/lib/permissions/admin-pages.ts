import type { Permission } from '@/types/permissions';

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
  return null;
}
